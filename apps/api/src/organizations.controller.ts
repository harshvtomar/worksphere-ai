import { BadRequestException, Body, ConflictException, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { database, type Transaction } from './database.js';
import { randomToken, SessionGuard, webOrigin } from './security.js';

const emailSchema = z.string().trim().toLowerCase().email().max(254);
const inviteSchema = z.object({ email: emailSchema, role: z.enum(['ADMIN', 'MEMBER']) }).strict();
const orgSchema = z.object({ name: z.string().trim().min(2).max(80), slug: z.string().min(3).max(48).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) }).strict();
function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) throw new BadRequestException('Invalid request fields');
  return result.data;
}
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

async function member(tx: Transaction, organizationId: string, userId: string) {
  // Serialize authorization-sensitive writes on the tenant row, including revocation.
  await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId} FOR UPDATE`;
  const membership = await tx.membership.findUnique({ where: { userId_organizationId: { userId, organizationId } } });
  if (!membership) throw new NotFoundException('Organization not found');
  return membership;
}
function canInvite(actorRole: string, invitedRole: string) {
  return actorRole === 'OWNER' || (actorRole === 'ADMIN' && invitedRole === 'MEMBER');
}
const scoped = <T>(id: string, userId: string, fn: (tx: Transaction, role: string) => Promise<T>) => database().$transaction(async tx => {
  const actor = await member(tx, id, userId);
  return fn(tx, actor.role);
});

@Controller()
@UseGuards(SessionGuard)
export class OrganizationsController {
  @Get('organizations')
  async list(@Req() req: Request) {
    return database().membership.findMany({ where: { userId: req.session.userId! }, select: { role: true, organization: { select: { id: true, name: true, slug: true } } }, orderBy: { joinedAt: 'asc' } });
  }

  @Post('organizations')
  async create(@Req() req: Request, @Body() body: unknown) {
    const data = parse(orgSchema, body);
    try {
      const org = await database().organization.create({ data: { ...data, members: { create: { userId: req.session.userId!, role: 'OWNER' } } } });
      req.session.organizationId = org.id;
      return org;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictException('That organization slug is already in use');
      throw error;
    }
  }

  @Get('organizations/:id')
  async details(@Req() req: Request, @Param('id') id: string) {
    return scoped(id, req.session.userId!, async (tx, role) => ({ ...await tx.organization.findUnique({ where: { id } }), role }));
  }

  @Post('organizations/:id/select')
  async select(@Req() req: Request, @Param('id') id: string) {
    await scoped(id, req.session.userId!, async () => { req.session.organizationId = id; });
    return { activeOrganizationId: id };
  }

  @Get('organizations/:id/members')
  async members(@Req() req: Request, @Param('id') id: string) {
    return scoped(id, req.session.userId!, tx => tx.membership.findMany({ where: { organizationId: id }, select: { id: true, userId: true, role: true, joinedAt: true, user: { select: { displayName: true, email: true } } }, orderBy: { joinedAt: 'asc' } }));
  }

  @Patch('organizations/:id/members/:membershipId')
  async role(@Req() req: Request, @Param('id') id: string, @Param('membershipId') membershipId: string, @Body() body: unknown) {
    const { role } = parse(z.object({ role: z.enum(['ADMIN', 'MEMBER']) }).strict(), body);
    return scoped(id, req.session.userId!, async (tx, actorRole) => {
      if (actorRole !== 'OWNER') throw new ForbiddenException('Only the owner can change roles');
      const target = await tx.membership.findFirst({ where: { id: membershipId, organizationId: id } });
      if (!target) throw new NotFoundException();
      if (target.role === 'OWNER') throw new ForbiddenException('Ownership cannot be changed here');
      return tx.membership.update({ where: { id: target.id }, data: { role } });
    });
  }

  @Delete('organizations/:id/members/:membershipId')
  async remove(@Req() req: Request, @Param('id') id: string, @Param('membershipId') membershipId: string) {
    return scoped(id, req.session.userId!, async (tx, actorRole) => {
      const target = await tx.membership.findFirst({ where: { id: membershipId, organizationId: id } });
      if (!target) throw new NotFoundException();
      if (target.role === 'OWNER' || actorRole === 'MEMBER' || (actorRole === 'ADMIN' && target.role !== 'MEMBER')) throw new ForbiddenException('Not permitted to remove this member');
      await tx.membership.delete({ where: { id: target.id } });
      return { ok: true };
    });
  }

  @Get('organizations/:id/invitations')
  async invitations(@Req() req: Request, @Param('id') id: string) {
    return scoped(id, req.session.userId!, async (tx, role) => {
      if (role === 'MEMBER') throw new ForbiddenException();
      return tx.invitation.findMany({ where: { organizationId: id }, select: { id: true, email: true, role: true, expiresAt: true, acceptedAt: true, revokedAt: true }, orderBy: { createdAt: 'desc' }, take: 100 });
    });
  }

  @Post('organizations/:id/invitations')
  async invite(@Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    const { email, role } = parse(inviteSchema, body);
    return scoped(id, req.session.userId!, async (tx, actorRole) => {
      if (!canInvite(actorRole, role)) throw new ForbiddenException('Not permitted to invite this role');
      if (await tx.membership.findFirst({ where: { organizationId: id, user: { email } } })) throw new ConflictException('This person is already a member');
      if (actorRole === 'ADMIN' && await tx.invitation.findFirst({ where: { organizationId: id, email, role: 'ADMIN', acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } } })) throw new ForbiddenException('Only the owner can replace an admin invitation');
      const token = randomToken();
      // Reissuing revokes earlier outstanding invitations for this address.
      await tx.invitation.updateMany({ where: { organizationId: id, email, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
      const invitation = await tx.invitation.create({ data: { email, role, organizationId: id, inviterId: req.session.userId!, tokenHash: hash(token), expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) } });
      return { id: invitation.id, expiresAt: invitation.expiresAt, invitationUrl: `${webOrigin()}/invite#token=${token}` };
    });
  }

  @Delete('organizations/:id/invitations/:invitationId')
  async revoke(@Req() req: Request, @Param('id') id: string, @Param('invitationId') invitationId: string) {
    return scoped(id, req.session.userId!, async (tx, role) => {
      const invitation = await tx.invitation.findFirst({ where: { id: invitationId, organizationId: id } });
      if (!invitation) throw new NotFoundException();
      if (!canInvite(role, invitation.role)) throw new ForbiddenException();
      await tx.invitation.update({ where: { id: invitation.id }, data: { revokedAt: new Date() } });
      return { ok: true };
    });
  }

  @Post('invitations/accept')
  async accept(@Req() req: Request, @Body() body: unknown) {
    const { token } = parse(z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).strict(), body);
    return database().$transaction(async tx => {
      const invitation = await tx.invitation.findUnique({ where: { tokenHash: hash(token) } });
      if (!invitation) throw new NotFoundException('Invitation unavailable');
      await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${invitation.organizationId} FOR UPDATE`;
      const current = await tx.invitation.findUnique({ where: { id: invitation.id } });
      const user = await tx.user.findUnique({ where: { id: req.session.userId! } });
      const inviter = await tx.membership.findUnique({ where: { userId_organizationId: { userId: invitation.inviterId, organizationId: invitation.organizationId } } });
      if (!current || current.acceptedAt || current.revokedAt || current.expiresAt <= new Date() || !inviter || !canInvite(inviter.role, current.role)) throw new ConflictException('Invitation expired, revoked or already used');
      if (user?.email !== invitation.email) throw new ForbiddenException('Sign in using the invited email address');
      if (await tx.membership.findUnique({ where: { userId_organizationId: { userId: req.session.userId!, organizationId: invitation.organizationId } } })) throw new ConflictException('Already a member');
      await tx.invitation.update({ where: { id: current.id }, data: { acceptedAt: new Date() } });
      await tx.membership.create({ data: { userId: req.session.userId!, organizationId: invitation.organizationId, role: invitation.role } });
      req.session.organizationId = invitation.organizationId;
      return { organizationId: invitation.organizationId };
    });
  }
}
