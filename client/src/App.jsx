import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import BlurText from './components/BlurText/BlurText';
import SpotlightCard from './components/SpotlightCard';
import DepthCarousel from './components/DepthCarousel';
import CountUp from './components/CountUp/CountUp';
import GlareHover from './components/GlareHover';
import api from './services/api';

/* =========================================
   ICONS (inline SVG)
========================================= */
const icons = {
  plus: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16M4 12h16"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>,
  edit: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M11 5a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
  delete: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
  bell: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  clock: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  nudge: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
};

/* =========================================
   HERO VIDEO BACKGROUND
========================================= */
const HeroVideo = () => {
  const videoRef = useRef(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {});
    const onCanPlay = () => v.classList.add('is-settled');
    v.addEventListener('canplay', onCanPlay);
    return () => v.removeEventListener('canplay', onCanPlay);
  }, []);
  return (
    <video
      ref={videoRef}
      className="hero-video"
      autoPlay
      muted
      loop
      playsInline
      poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1920 1080'%3E%3Crect fill='%23050508'/%3E%3C/svg%3E"
    >
      <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260511_230229_7c9bc431-46cf-489a-948d-e8144d8eb5d4.mp4" type="video/mp4" />
    </video>
  );
};

/* =========================================
   CURSOR SPOTLIGHT OVERLAY
========================================= */
const SpotlightOverlay = () => {
  const [pos, setPos] = useState({ x: '50%', y: '50%' });
  useEffect(() => {
    let raf = 0;
    let target = { x: 0.5, y: 0.5 };
    let current = { x: 0.5, y: 0.5 };
    const move = e => { target.x = e.clientX / window.innerWidth; target.y = e.clientY / window.innerHeight; };
    window.addEventListener('pointermove', move, { passive: true });
    const tick = () => {
      current.x += (target.x - current.x) * 0.12;
      current.y += (target.y - current.y) * 0.12;
      setPos({ x: `${current.x * 100}%`, y: `${current.y * 100}%` });
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div
      className="spotlight-overlay"
      style={{ '--mx': pos.x, '--my': pos.y }}
      aria-hidden="true"
    />
  );
};

/* =========================================
   NAVIGATION
========================================= */
const Nav = ({ onNewReminder, scrollY }) => (
  <nav className={`nav ${scrollY > 100 ? 'scrolled' : ''}`} role="navigation" aria-label="Main">
    <div className="nav-pill liquid-glass liquid-glass--nav">
      <span className="nav-wordmark">
        <span style={{display:'inline-flex',alignItems:'center',gap:6}}>{icons.nudge}</span>
        Nudge<em>.</em>
      </span>
      <div className="nav-links">
        <a href="#upcoming">Upcoming</a>
        <a href="#overdue">Overdue</a>
        <a href="#completed">Completed</a>
        <a href="#notifications">History</a>
      </div>
      <GlareHover
        className="nav-cta"
        mode="hover"
        variant="streak"
        glareColor="#7057e8"
        glareOpacity={0.55}
        softness={0.5}
        background="transparent"
        borderColor="rgba(112,87,232,0.3)"
        borderRadius="999px"
        width="auto"
        height="auto"
        onClick={onNewReminder}
      >
        <button className="btn btn-primary btn-sm" style={{background:'transparent',border:'none',boxShadow:'none',padding:'0.5rem 1rem'}} onClick={onNewReminder}>
          {icons.plus} New Reminder
        </button>
      </GlareHover>
    </div>
  </nav>
);

/* =========================================
   HERO SECTION
========================================= */
const Hero = ({ onNewReminder }) => (
  <section className="hero-stage" aria-labelledby="hero-title">
    <HeroVideo />
    <div className="hero-scrim" />
    <SpotlightOverlay />
    <Nav onNewReminder={onNewReminder} scrollY={0} />
    <div className="hero-content">
      <div className="hero-body">
        <BlurText
          className="hero-eyebrow"
          text="Never miss what matters"
          animateBy="words"
          trigger="load"
          delay={0.2}
          stepDuration={0.08}
          effect="blur"
          blur={12}
          distance={0}
          easing="easeOut"
          fromColor="var(--fg-40)"
          color="var(--fg-100)"
        >
          <span className="eyebrow" style={{opacity:0}}>
            <span className="dot" />
            Never miss what matters
          </span>
        </BlurText>
        <h1 id="hero-title" className="hero-headline">
          <BlurText
            text="Deadlines that arrive on time"
            animateBy="words"
            trigger="load"
            delay={0.4}
            stepDuration={0.09}
            effect="blur"
            blur={16}
            distance={8}
            easing="easeOut"
            fromColor="transparent"
            color="var(--fg-100)"
            className="blur-word"
          />
        </h1>
        <p className="hero-sub">
          Cinematic deadline scheduling with intelligent notifications.
          Create reminders once — they arrive exactly when you need them.
        </p>
        <div className="hero-actions">
          <GlareHover
            mode="hover"
            variant="streak"
            glareColor="#7057e8"
            glareOpacity={0.6}
            softness={0.45}
            background="transparent"
            borderColor="rgba(112,87,232,0.4)"
            borderRadius="999px"
            onClick={onNewReminder}
          >
            <button className="btn btn-primary btn-lg" onClick={onNewReminder}>
              {icons.plus} Create Reminder
            </button>
          </GlareHover>
          <GlareHover
            mode="hover"
            variant="sheen"
            glareColor="#ffffff"
            glareOpacity={0.12}
            softness={0.6}
            background="rgba(255,255,255,0.04)"
            borderColor="rgba(255,255,255,0.1)"
            borderRadius="999px"
            onClick={() => document.getElementById('upcoming')?.scrollIntoView({behavior:'smooth'})}
          >
            <button className="btn btn-ghost btn-lg" onClick={() => document.getElementById('upcoming')?.scrollIntoView({behavior:'smooth'})}>
              See how it works {icons.clock}
            </button>
          </GlareHover>
        </div>
      </div>
    </div>
    {/* Page grain overlay */}
    <div className="page-grain" aria-hidden="true" />
  </section>
);

/* =========================================
   SCROLL STORY FRAME
========================================= */
const StoryFrame = ({ index, icon, title, description, delay }) => (
  <section className={`section ${index % 2 === 0 ? 'section--dark' : 'section--alt'}`} aria-labelledby={`story-${index}`}>
    <div className="container">
      <div className={`section-head reveal reveal--delay-${index}`}>
        <div className="section-eyebrow">
          <span className="dot" style={{background:'var(--color-primary)',boxShadow:'0 0 14px var(--color-primary)'}} />
          Step {index}
        </div>
        <h2 id={`story-${index}`} className="section-title">{title}</h2>
        <p className="section-lede">{description}</p>
      </div>
      <div className={`reveal reveal--delay-${index}`} style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'280px'}}>
        <div className="liquid-glass glass-panel" style={{width:'100%',maxWidth:'420px',aspectRatio:'4/3',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <span style={{fontSize:'64px',color:'var(--color-primary)',opacity:0.8}}>{icon}</span>
        </div>
      </div>
    </div>
  </section>
);

/* =========================================
   SCROLL STORY SECTION
========================================= */
const ScrollStory = () => (
  <>
    <StoryFrame
      index={1}
      icon={icons.plus}
      title="Capture in seconds"
      description="Type a title, pick a date, set priority. Natural language parsing coming soon - just say 'tomorrow 3pm' and it works."
      delay={0.1}
    />
    <StoryFrame
      index={2}
      icon={icons.calendar}
      title="Schedule with precision"
      description="Timezone-aware, recurring, priority-sorted. Your reminders live in a beautiful depth carousel - not a flat list."
      delay={0.1}
    />
    <StoryFrame
      index={3}
      icon={icons.bell}
      title="Arrive on time"
      description="Multi-channel notifications (email, push, webhook) with exponential backoff. History log shows every attempt."
      delay={0.1}
    />
  </>
);

/* =========================================
   DEPTH CAROUSEL — Featured Reminders
========================================= */
const ReminderDepthCarousel = ({ reminders }) => {
  const upcoming = reminders
    .filter(r => r.status === 'pending' && new Date(r.dueDate) >= new Date())
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 6);

  const items = upcoming.length > 0 ? upcoming.map(r => ({
    image: `https://picsum.photos/seed/${r.id}/800/1000`,
    alt: r.title,
    data: r
  })) : [
    { image: 'https://picsum.photos/seed/demo1/800/1000', alt: 'Project deadline', data: { title: 'Project deadline', dueDate: new Date(Date.now()+86400000).toISOString(), priority: 'high', category: 'work' }},
    { image: 'https://picsum.photos/seed/demo2/800/1000', alt: 'Team sync', data: { title: 'Team sync', dueDate: new Date(Date.now()+172800000).toISOString(), priority: 'medium', category: 'personal' }},
    { image: 'https://picsum.photos/seed/demo3/800/1000', alt: 'Gym session', data: { title: 'Gym session', dueDate: new Date(Date.now()+259200000).toISOString(), priority: 'low', category: 'health' }},
    { image: 'https://picsum.photos/seed/demo4/800/1000', alt: 'Study block', data: { title: 'Study block', dueDate: new Date(Date.now()+345600000).toISOString(), priority: 'medium', category: 'study' }},
  ];

  return (
    <section className="section section--alt depth-section" id="featured" aria-labelledby="featured-title">
      <div className="container">
        <div className="section-head">
          <div className="section-eyebrow">
            <span className="dot" style={{background:'var(--color-primary)',boxShadow:'0 0 14px var(--color-primary)'}} />
            Featured
          </div>
          <h2 id="featured-title" className="section-title">Upcoming in focus</h2>
          <p className="section-lede">
            Drag or scroll to explore. Cards closer to you are more urgent. Click to edit.
          </p>
        </div>
        <div className="depth-carousel-wrap">
          <DepthCarousel
            items={items}
            cardWidth={320}
            cardHeight={400}
            radius={20}
            tint="#05060a"
            depth={260}
            spread={110}
            tilt={28}
            tiltDirection="right"
            perspective={1600}
            visibleCards={3.5}
            falloff={0.18}
            blur={8}
            duration={800}
            ease="power3.out"
            autoplay={false}
            loop={true}
            showControls={true}
            showIndicators={true}
            className="depth-carousel"
          />
        </div>
      </div>
    </section>
  );
};

/* =========================================
   STATS WITH COUNTUP
========================================= */
const CinematicStats = ({ reminders }) => {
  const pending = reminders.filter(r => r.status === 'pending').length;
  const overdue = reminders.filter(r => r.status === 'pending' && new Date(r.dueDate) < new Date()).length;
  const completed = reminders.filter(r => r.status === 'completed').length;
  const total = reminders.length;

  return (
    <section className="section section--dark" id="stats" aria-labelledby="stats-title">
      <div className="container">
        <div className="section-head" style={{marginBottom:'3rem'}}>
          <h2 id="stats-title" className="section-title" style={{textAlign:'left',marginBottom:'0.5rem'}}>At a glance</h2>
          <p className="section-lede" style={{maxWidth:'none',textAlign:'left'}}>Real-time counts. Numbers count up on first view.</p>
        </div>
        <div className="stats-grid" role="list">
          <article className="stat-card" role="listitem">
            <span className="stat-accent" />
            <CountUp
              to={total}
              duration={1.6}
              delay={0.1}
              easing="expo"
              trigger="view"
              format="standard"
              separator=","
              className="stat-number"
            />
            <p className="stat-label">Total Reminders</p>
          </article>
          <article className="stat-card" role="listitem">
            <span className="stat-accent" style={{background:'var(--color-warning)',boxShadow:'0 0 18px var(--color-warning)'}} />
            <CountUp
              to={pending}
              duration={1.4}
              delay={0.2}
              easing="expo"
              trigger="view"
              format="standard"
              className="stat-number"
            />
            <p className="stat-label">Pending</p>
          </article>
          <article className="stat-card" role="listitem">
            <span className="stat-accent" style={{background:'var(--color-danger)',boxShadow:'0 0 18px var(--color-danger)'}} />
            <CountUp
              to={overdue}
              duration={1.2}
              delay={0.3}
              easing="expo"
              trigger="view"
              format="standard"
              className="stat-number"
            />
            <p className="stat-label">Overdue</p>
          </article>
          <article className="stat-card" role="listitem">
            <span className="stat-accent" style={{background:'var(--color-success)',boxShadow:'0 0 18px var(--color-success)'}} />
            <CountUp
              to={completed}
              duration={1.5}
              delay={0.4}
              easing="expo"
              trigger="view"
              format="standard"
              className="stat-number"
            />
            <p className="stat-label">Completed</p>
          </article>
        </div>
      </div>
    </section>
  );
};

/* =========================================
   DASHBOARD — Functional Core (Cinematic Upgrade)
========================================= */
const Dashboard = ({
  reminders,
  notifications,
  loading,
  error,
  onCreate,
  onEdit,
  onDelete,
  onComplete,
  onRefreshNotifications,
  showModal,
  closeModal,
  editingReminder,
  formData,
  formErrors,
  handleSubmit,
  handleChange
}) => {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [spotlightRow, setSpotlightRow] = useState(null);

  const pendingReminders = reminders.filter(r => r.status === 'pending');
  const completedReminders = reminders.filter(r => r.status === 'completed');
  const overdueReminders = pendingReminders.filter(r => new Date(r.dueDate) < new Date());
  const upcomingReminders = pendingReminders.filter(r => new Date(r.dueDate) >= new Date());

  const formatDate = (dateStr) => new Date(dateStr).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const getStatusBadge = (status) => {
    const map = { pending: 'badge-warning', completed: 'badge-success', cancelled: 'badge-gray' };
    return map[status] || 'badge-gray';
  };

  const getPriorityBadge = (priority) => {
    const map = { low: 'badge-gray', medium: 'badge-primary', high: 'badge-danger' };
    return map[priority] || 'badge-gray';
  };

  const tabs = [
    { id: 'upcoming', label: `Upcoming (${upcomingReminders.length})`, count: upcomingReminders.length },
    { id: 'overdue', label: `Overdue (${overdueReminders.length})`, count: overdueReminders.length },
    { id: 'completed', label: `Completed (${completedReminders.length})`, count: completedReminders.length },
  ];

  return (
    <section className="dashboard" id="upcoming" aria-label="Dashboard">
      <header className="dashboard-header">
        <h1 className="dashboard-title">Your <span className="accent">Reminders</span></h1>
        <GlareHover
          mode="hover"
          variant="streak"
          glareColor="#7057e8"
          glareOpacity={0.55}
          softness={0.5}
          background="transparent"
          borderColor="rgba(112,87,232,0.3)"
          borderRadius="999px"
          onClick={onCreate}
        >
          <button className="btn btn-primary" onClick={onCreate}>{icons.plus} New Reminder</button>
        </GlareHover>
      </header>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="glass-panel mb-6 p-4"
          style={{borderColor:'rgba(223,83,99,0.3)',background:'rgba(223,83,99,0.08)'}}
          role="alert"
        >
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
            <span style={{color:'#ff9aa3'}}>{error}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setError(null)}>Dismiss</button>
          </div>
        </motion.div>
      )}

      {/* Tab Navigation */}
      <div className="glass-panel mb-6" style={{padding:'6px',display:'inline-flex',gap:'4px',borderRadius:'var(--radius-full)'}}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`px-5 py-2.5 text-sm font-semibold rounded-full transition-all ${
              activeTab === tab.id
                ? 'bg-white/5 text-white shadow-md'
                : 'text-gray-500 hover:text-white hover:bg-white/3'
            }`}
            onClick={() => setActiveTab(tab.id)}
            aria-selected={activeTab === tab.id}
            role="tab"
            aria-controls={`${tab.id}-panel`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div role="tabpanel" id={`${activeTab}-panel`} aria-labelledby={`${activeTab}-tab`}>
        {activeTab === 'upcoming' && (
          <UpcomingPanel
            reminders={upcomingReminders}
            formatDate={formatDate}
            getPriorityBadge={getPriorityBadge}
            getStatusBadge={getStatusBadge}
            onEdit={onEdit}
            onComplete={onComplete}
            onDelete={onDelete}
            spotlightRow={spotlightRow}
            setSpotlightRow={setSpotlightRow}
          />
        )}
        {activeTab === 'overdue' && (
          <OverduePanel
            reminders={overdueReminders}
            formatDate={formatDate}
            getPriorityBadge={getPriorityBadge}
            onEdit={onEdit}
            onComplete={onComplete}
            spotlightRow={spotlightRow}
            setSpotlightRow={setSpotlightRow}
          />
        )}
        {activeTab === 'completed' && (
          <CompletedPanel
            reminders={completedReminders}
            formatDate={formatDate}
            getPriorityBadge={getPriorityBadge}
          />
        )}
      </div>

      {/* Notification History */}
      <section className="card mt-6" id="notifications" aria-labelledby="notifications-title">
        <div className="card-header flex items-center justify-between">
          <h2 id="notifications-title" className="text-lg font-semibold flex items-center gap-2">
            {icons.bell} Notification History
          </h2>
          <GlareHover
            mode="hover"
            variant="sheen"
            glareColor="#ffffff"
            glareOpacity={0.1}
            softness={0.6}
            background="rgba(255,255,255,0.04)"
            borderColor="rgba(255,255,255,0.1)"
            borderRadius="999px"
            onClick={onRefreshNotifications}
          >
            <button className="btn btn-ghost btn-sm" onClick={onRefreshNotifications} disabled={loading}>
              {icons.clock} Refresh
            </button>
          </GlareHover>
        </div>
        <div className="card-body p-0">
          {notifications.length === 0 ? (
            <div className="empty-state">
              {icons.bell}
              <p className="empty-state-title">No notifications yet</p>
              <p className="empty-state-description">Notifications will appear here when reminders are due</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Reminder</th>
                    <th>Scheduled</th>
                    <th>Attempted</th>
                    <th>Status</th>
                    <th>Attempts</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .slice(0, 50)
                    .map((notification) => (
                      <tr key={notification.id}>
                        <td className="font-medium max-w-xs truncate" title={notification.reminderId?.title || notification.reminderId}>
                          {notification.reminderId?.title || notification.reminderId}
                        </td>
                        <td>{formatDate(notification.scheduledAt)}</td>
                        <td>{notification.attemptedAt ? formatDate(notification.attemptedAt) : '-'}</td>
                        <td>
                          <span className={getStatusBadge(notification.status)}>
                            {notification.status}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-gray">{notification.attemptCount}</span>
                        </td>
                        <td className="text-sm text-gray-500 max-w-xs truncate" title={notification.errorMessage}>
                          {notification.errorMessage || '-'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </section>
  );
};

/* =========================================
   TABLE PANELS (extracted for clarity)
========================================= */
const UpcomingPanel = ({ reminders, formatDate, getPriorityBadge, getStatusBadge, onEdit, onComplete, onDelete, spotlightRow, setSpotlightRow }) => {
  if (reminders.length === 0) {
    return (
      <div className="glass-panel py-12 text-center">
        {icons.calendar}
        <p className="empty-state-title mt-4">No upcoming reminders</p>
        <p className="empty-state-description mt-2">Create your first reminder to get started</p>
      </div>
    );
  }
  return (
    <div className="glass-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Due Date</th>
              <th>Priority</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reminders
              .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
              .map((reminder) => (
                <tr
                  key={reminder.id}
                  className={`table-row-spotlight ${spotlightRow === reminder.id ? 'is-spotlit' : ''}`}
                  onMouseEnter={() => setSpotlightRow(reminder.id)}
                  onMouseLeave={() => setSpotlightRow(null)}
                >
                  <td className="font-medium">{reminder.title}</td>
                  <td><span className="badge badge-primary">{reminder.category}</span></td>
                  <td>{formatDate(reminder.dueDate)}</td>
                  <td><span className={getPriorityBadge(reminder.priority)}>{reminder.priority}</span></td>
                  <td><span className={getStatusBadge(reminder.status)}>{reminder.status}</span></td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <GlareHover mode="hover" variant="sheen" glareColor="#ffffff" glareOpacity={0.08} softness={0.6} background="rgba(255,255,255,0.04)" borderColor="rgba(255,255,255,0.1)" borderRadius="var(--radius-sm)" onClick={() => onEdit(reminder)}>
                        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(reminder)} aria-label="Edit reminder">{icons.edit}</button>
                      </GlareHover>
                      <GlareHover mode="hover" variant="streak" glareColor="#149b78" glareOpacity={0.5} softness={0.5} background="transparent" borderColor="rgba(20,155,120,0.3)" borderRadius="var(--radius-sm)" onClick={() => onComplete(reminder.id)}>
                        <button className="btn btn-success btn-sm" onClick={() => onComplete(reminder.id)} aria-label="Mark complete">{icons.check}</button>
                      </GlareHover>
                      <GlareHover mode="hover" variant="streak" glareColor="#df5363" glareOpacity={0.5} softness={0.5} background="transparent" borderColor="rgba(223,83,99,0.3)" borderRadius="var(--radius-sm)" onClick={() => onDelete(reminder.id)}>
                        <button className="btn btn-ghost btn-sm text-danger" onClick={() => onDelete(reminder.id)} aria-label="Delete reminder">{icons.delete}</button>
                      </GlareHover>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const OverduePanel = ({ reminders, formatDate, getPriorityBadge, onEdit, onComplete, spotlightRow, setSpotlightRow }) => {
  if (reminders.length === 0) return null;
  return (
    <div className="glass-panel overflow-hidden" style={{borderColor:'rgba(223,83,99,0.2)'}}>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th className="text-danger">Due Date</th>
              <th>Priority</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reminders
              .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
              .map((reminder) => (
                <tr
                  key={reminder.id}
                  className={`table-row-spotlight ${spotlightRow === reminder.id ? 'is-spotlit' : ''}`}
                  onMouseEnter={() => setSpotlightRow(reminder.id)}
                  onMouseLeave={() => setSpotlightRow(null)}
                >
                  <td className="font-medium">{reminder.title}</td>
                  <td><span className="badge badge-primary">{reminder.category}</span></td>
                  <td className="text-danger font-medium">{formatDate(reminder.dueDate)}</td>
                  <td><span className={getPriorityBadge(reminder.priority)}>{reminder.priority}</span></td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <GlareHover mode="hover" variant="sheen" glareColor="#ffffff" glareOpacity={0.08} softness={0.6} background="rgba(255,255,255,0.04)" borderColor="rgba(255,255,255,0.1)" borderRadius="var(--radius-sm)" onClick={() => onEdit(reminder)}>
                        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(reminder)}>{icons.edit} Reschedule</button>
                      </GlareHover>
                      <GlareHover mode="hover" variant="streak" glareColor="#149b78" glareOpacity={0.5} softness={0.5} background="transparent" borderColor="rgba(20,155,120,0.3)" borderRadius="var(--radius-sm)" onClick={() => onComplete(reminder.id)}>
                        <button className="btn btn-success btn-sm" onClick={() => onComplete(reminder.id)}>{icons.check} Complete</button>
                      </GlareHover>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CompletedPanel = ({ reminders, formatDate, getPriorityBadge }) => {
  if (reminders.length === 0) {
    return (
      <div className="glass-panel py-12 text-center">
        {icons.check}
        <p className="empty-state-title mt-4">No completed reminders yet</p>
        <p className="empty-state-description mt-2">Finish a reminder to see it here</p>
      </div>
    );
  }
  return (
    <div className="glass-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Due Date</th>
              <th>Completed At</th>
            </tr>
          </thead>
          <tbody>
            {reminders
              .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
              .map((reminder) => (
                <tr key={reminder.id}>
                  <td>{reminder.title}</td>
                  <td><span className="badge badge-primary">{reminder.category}</span></td>
                  <td>{formatDate(reminder.dueDate)}</td>
                  <td><span className="text-sm text-gray-500">{formatDate(reminder.updatedAt)}</span></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* =========================================
   MODAL (Liquid Glass)
========================================= */
const ReminderModal = ({
  
  isOpen,
  onClose,
  editingReminder,
  formData,
  formErrors,
  loading,
  handleSubmit,
  handleChange
}) => {
  if (!isOpen) return null;

  const categories = [
    { value: 'personal', label: 'Personal' },
    { value: 'work', label: 'Work' },
    { value: 'study', label: 'Study' },
    { value: 'health', label: 'Health' },
    { value: 'other', label: 'Other' },
  ];
  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 22, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        className="modal liquid-glass liquid-glass--strong"
        style={{borderRadius:'var(--radius-xl)',borderColor:'rgba(255,255,255,0.12)',maxWidth:'40rem'}}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header" style={{borderColor:'rgba(255,255,255,0.08)'}}>
          <h2 id="modal-title" className="modal-title">
            {editingReminder ? 'Edit Reminder' : 'Create Reminder'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="modal-body" style={{padding:'1.75rem'}}>
          <div className="form-group">
            <label htmlFor="title" className="label">Title *</label>
            <input
              type="text"
              id="title"
               name="title"  
              className={`input ${formErrors.title ? 'border-danger' : ''}`}
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter reminder title"
              maxLength={200}
              autoFocus
            />
            {formErrors.title && <p className="form-error">{formErrors.title}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="description" className="label">Description</label>
            <textarea
              id="description"
              className="input textarea"
               name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Optional description"
              maxLength={2000}
            />
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'1rem'}}>
            <div className="form-group">
              <label htmlFor="category" className="label">Category</label>
              <select
                id="category"
                 name="category"
                className="input select"
                value={formData.category}
                onChange={handleChange}
              >
                {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="priority" className="label">Priority</label>
              <select
                id="priority"
                 name="priority"
                className="input select"
                value={formData.priority}
                onChange={handleChange}
              >
                {priorities.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="dueDate" className="label">Due Date & Time *</label>
            <input
              type="datetime-local"
              id="dueDate"
                name="dueDate"
              className={`input ${formErrors.dueDate ? 'border-danger' : ''}`}
              value={formData.dueDate}
              onChange={handleChange}
            />
            {formErrors.dueDate && <p className="form-error">{formErrors.dueDate}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="timezone" className="label">Timezone</label>
            <input
              type="text"
              id="timezone"
               name="timezone"
              className="input"
              value={formData.timezone}
              onChange={handleChange}
              placeholder="IANA timezone (e.g., America/New_York)"
            />
            <p className="text-xs text-gray-500 mt-1">Used for display. Stored dates are in UTC.</p>
          </div>

          <div className="modal-footer" style={{marginTop:'1.5rem',paddingTop:'1.25rem',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
            <GlareHover mode="hover" variant="sheen" glareColor="#ffffff" glareOpacity={0.1} softness={0.6} background="rgba(255,255,255,0.04)" borderColor="rgba(255,255,255,0.1)" borderRadius="999px" onClick={onClose}>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
            </GlareHover>
            <GlareHover mode="hover" variant="streak" glareColor="#7057e8" glareOpacity={0.55} softness={0.45} background="transparent" borderColor="rgba(112,87,232,0.4)" borderRadius="999px" onClick={handleSubmit}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <> <span className="spinner" style={{width:16,height:16,marginRight:8}} /> Saving... </> : (editingReminder ? 'Update' : 'Create')}
              </button>
            </GlareHover>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

/* =========================================
   MAIN APP
========================================= */
function App() {
  const [reminders, setReminders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other',
    dueDate: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    priority: 'medium'
  });
  const [formErrors, setFormErrors] = useState({});
  const [scrollY, setScrollY] = useState(0);

  const fetchReminders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.reminders.list();
      setReminders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.notifications.list();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
    fetchNotifications();
  }, [fetchReminders, fetchNotifications]);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    const errors = {};
    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!formData.dueDate) errors.dueDate = 'Due date is required';
    if (errors.title || errors.dueDate) { setFormErrors(errors); return; }
    try {
      setLoading(true);
      if (editingReminder) await api.reminders.update(editingReminder.id, formData);
      else await api.reminders.create(formData);
      closeModal();
      fetchReminders();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const openCreateModal = () => {
    setEditingReminder(null);
    setFormData({
      title: '', description: '', category: 'other',
      dueDate: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      priority: 'medium'
    });
    setShowModal(true);
  };

  const openEditModal = (reminder) => {
    setEditingReminder(reminder);
    setFormData({
      title: reminder.title,
      description: reminder.description || '',
      category: reminder.category,
      dueDate: new Date(reminder.dueDate).toISOString().slice(0, 16),
      timezone: reminder.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      priority: reminder.priority
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingReminder(null);
    setFormErrors({});
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) return;
    try { await api.reminders.delete(id); fetchReminders(); }
    catch (err) { setError(err.message); }
  };

  const handleComplete = async (id) => {
    try { await api.reminders.complete(id); fetchReminders(); }
    catch (err) { setError(err.message); }
  };

  const clearError = () => setError(null);

  if (loading && reminders.length === 0) {
    return (
      <div style={{minHeight:'100dvh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'1rem',background:'#050508'}}>
        <div className="spinner" style={{width:48,height:48,borderWidth:3}} />
        <p style={{color:'var(--fg-60)'}}>Loading reminders...</p>
      </div>
    );
  }

  return (
    <div style={{minHeight:'100dvh',background:'#050508'}}>
     {/* Cinematic Hero */}
<Hero onNewReminder={openCreateModal} />

{/* Stats with CountUp */}
<CinematicStats reminders={reminders} />

{/* Dashboard — Functional Core */}
      <Dashboard
        reminders={reminders}
        notifications={notifications}
        loading={loading}
        error={error}
        onCreate={openCreateModal}
        onEdit={openEditModal}
        onDelete={handleDelete}
        onComplete={handleComplete}
        onRefreshNotifications={fetchNotifications}
        showModal={showModal}
        closeModal={closeModal}
        editingReminder={editingReminder}
        formData={formData}
        formErrors={formErrors}
        handleSubmit={handleSubmit}
        handleChange={handleChange}
      />

      {/* Modal */}
      <ReminderModal
        isOpen={showModal}
        onClose={closeModal}
        editingReminder={editingReminder}
        formData={formData}
        formErrors={formErrors}
        loading={loading}
        handleSubmit={handleSubmit}
        handleChange={handleChange}
      />
    </div>
  );
}

export default App;