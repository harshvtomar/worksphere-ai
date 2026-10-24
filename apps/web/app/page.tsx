import { ApiStatus } from "../components/api-status";
import { Icon } from "../components/icons";

const navigation = [
  { label: "Overview", icon: "grid", selected: true },
  { label: "Projects", icon: "layers" },
  { label: "My tasks", icon: "inbox" },
  { label: "Automations", icon: "workflow" },
  { label: "Analytics", icon: "chart" },
] as const;

const tasks = [
  { id: "WS-104", name: "Review design system components", project: "Website refresh", person: "AL", style: "purple", tag: "Design", due: "Oct 26" },
  { id: "WS-105", name: "Prepare Q4 product release notes", project: "Product launch", person: "JK", style: "orange", tag: "Content", due: "Oct 28" },
  { id: "WS-106", name: "Set up staging environment", project: "Platform", person: "MS", style: "blue", tag: "Engineering", due: "Oct 30" },
  { id: "WS-107", name: "Map customer onboarding flow", project: "Customer success", person: "NP", style: "green", tag: "Research", due: "Nov 02" },
] as const;

const projects = [
  { name: "Website refresh", meta: "Design · 12 tasks", pct: 72, className: "violet", initials: "WR" },
  { name: "Product launch", meta: "Marketing · 8 tasks", pct: 54, className: "blue", initials: "PL" },
  { name: "Platform upgrade", meta: "Engineering · 16 tasks", pct: 89, className: "amber", initials: "PU" },
] as const;

export default function Home() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="WorkSphere AI home"><span className="brand-icon"><Icon name="bolt" size={21}/></span><span>WorkSphere<span className="brand-ai">AI</span></span></a>
        <div className="workspace-switch"><div className="workspace-icon">S</div><div className="workspace-copy"><strong>Studio North</strong><span>Free workspace</span></div><Icon name="chevron" size={16}/></div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation" className="nav-menu">
          {navigation.map((item) => <div key={item.label} className={`nav-link ${"selected" in item && item.selected ? "active" : ""}`} aria-current={"selected" in item && item.selected ? "page" : undefined}><Icon name={item.icon}/><span>{item.label}</span>{item.label === "My tasks" && <span className="nav-counter">4</span>}</div>)}
        </nav>
        <div className="nav-label team-label">YOUR TEAM</div>
        <div className="team-row"><span className="team-dot violet-dot"/>Design team <span className="team-num">06</span></div>
        <div className="team-row"><span className="team-dot blue-dot"/>Engineering <span className="team-num">12</span></div>
        <div className="team-row"><span className="team-dot orange-dot"/>Marketing <span className="team-num">04</span></div>
        <div className="sidebar-bottom">
          <div className="upgrade-card"><span className="upgrade-star">✦</span><strong>Power up your workflow</strong><p>Smart automation is coming soon.</p><span>Stage 1 preview <Icon name="arrow" size={14}/></span></div>
          <div className="profile"><div className="avatar avatar-profile">SN</div><div className="profile-copy"><strong>Studio North</strong><span>Demo account</span></div><Icon name="more" size={18}/></div>
        </div>
      </aside>

      <div className="main-region">
        <header className="topbar"><div className="breadcrumbs">Workspace <span>/</span> <strong>Overview</strong></div><div className="topbar-right"><div className="search-pill"><Icon name="search" size={16}/> Search workspace <kbd>⌘ K</kbd></div><span className="topbar-avatar">SN</span></div></header>
        <main className="content">
          <div className="notice"><span className="notice-dot"/> Stage 1 foundation · This is a preview with sample data. Actions become functional in later stages. <ApiStatus/></div>
          <div className="page-head"><div><div className="eyebrow">YOUR WORKSPACE AT A GLANCE</div><h1>Good morning, team <span>✳</span></h1><p>Here&apos;s what&apos;s happening across your workspace today.</p></div><div className="date-pill"><Icon name="calendar" size={17}/> October 24, 2026</div></div>
          <div className="stats-grid">
            <div className="stat-card"><span className="stat-icon lavender"><Icon name="layers" size={20}/></span><div className="stat-label">Active projects</div><div className="stat-value">12 <span className="stat-trend">↗ 12%</span></div><div className="stat-note">Across 3 departments</div></div>
            <div className="stat-card"><span className="stat-icon sky"><Icon name="check" size={20}/></span><div className="stat-label">Tasks completed</div><div className="stat-value">148 <span className="stat-trend">↗ 24%</span></div><div className="stat-note">In the last 30 days</div></div>
            <div className="stat-card"><span className="stat-icon peach"><Icon name="clock" size={20}/></span><div className="stat-label">In progress</div><div className="stat-value">36 <span className="stat-trend muted">8 due soon</span></div><div className="stat-note">Across all active projects</div></div>
            <div className="stat-card"><span className="stat-icon mint"><Icon name="people" size={20}/></span><div className="stat-label">Team members</div><div className="stat-value">22 <span className="avatar-stack"><span>AL</span><span>JK</span><span>MS</span></span></div><div className="stat-note">4 active this week</div></div>
          </div>
          <div className="content-grid">
            <section className="panel project-panel"><div className="panel-head"><div><h2>Project progress</h2><p>Track what your teams are working on</p></div><span className="nonfunctional-link">View all <Icon name="arrow" size={15}/></span></div><div className="project-list">{projects.map((project) => <div key={project.name} className="project-item"><div className={`project-tile ${project.className}`}>{project.initials}</div><div className="project-details"><div className="project-name-line"><strong>{project.name}</strong><span>{project.pct}%</span></div><div className="project-sub">{project.meta}</div><div className="progress-track"><div className={`progress-fill ${project.className}`} style={{ width: `${project.pct}%` }}/></div></div></div>)}</div></section>
            <section className="panel activity-panel"><div className="panel-head"><div><h2>Activity overview</h2><p>Team productivity this week</p></div><span className="tiny-select">This week <Icon name="chevron" size={14}/></span></div><div className="legend"><span><b className="legend-dot purple-dot"/> Completed</span><span><b className="legend-dot gray-dot"/> Created</span></div><div className="bar-chart" aria-label="Illustrative weekly activity chart"><div className="chart-grid"><span>40</span><span>30</span><span>20</span><span>10</span><span>0</span></div><div className="chart-bars">{[[40,58],[64,72],[44,85],[70,78],[56,95],[38,67],[48,80]].map((pair, idx)=><div className="bar-column" key={idx}><div className="bar-pair"><div className="bar created" style={{height:`${pair[0]}%`}}/><div className="bar completed" style={{height:`${pair[1]}%`}}/></div><span>{["M","T","W","T","F","S","S"][idx]}</span></div>)}</div></div></section>
          </div>
          <section className="panel tasks-panel"><div className="panel-head"><div><h2>Upcoming tasks</h2><p>Important work on the horizon</p></div><span className="nonfunctional-link">View tasks <Icon name="arrow" size={15}/></span></div><div className="table-scroll"><table className="task-table"><thead><tr><th>Task</th><th>Project</th><th>Assignee</th><th>Label</th><th>Due date</th></tr></thead><tbody>{tasks.map(task=><tr key={task.id}><td><div className="task-name"><span className="fake-checkbox" aria-hidden="true"/><div><strong>{task.name}</strong><small>{task.id}</small></div></div></td><td className="secondary-cell">{task.project}</td><td><span className={`avatar tiny ${task.style}`}>{task.person}</span></td><td><span className={`tag ${task.style}`}>{task.tag}</span></td><td className="secondary-cell">{task.due}</td></tr>)}</tbody></table></div></section>
          <div className="footer-note"><Icon name="shield" size={15}/> Demo workspace. No user accounts, task persistence, or payment features are enabled in Stage 1.</div>
        </main>
      </div>
    </div>
  );
}
