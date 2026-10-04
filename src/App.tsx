import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { supabase } from "./lib/supabase";
import {
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Heart,
  ImagePlus,
  Leaf,
  LocateFixed,
  LogIn,
  MapPin,
  Menu,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Truck,
  Upload,
  X,
} from "lucide-react";

type Category = "All materials" | "Lumber" | "Masonry" | "Fixtures" | "Hardware" | "Landscaping";

type SiteSettings = {
  hero_eyebrow:string; hero_title:string; hero_title_emphasis:string; hero_description:string;
  hero_location_label:string; hero_location:string; hero_image_url:string|null; weekly_drop_label:string; weekly_drop_title:string;
  diverted_stat:string; diverted_label:string; rehomed_stat:string; rehomed_label:string;
  browse_eyebrow:string; browse_title:string; how_eyebrow:string; how_title:string; how_title_emphasis:string; how_description:string;
  logo_url:string|null; logo_text:string; brand_subtitle:string;
  primary_color:string; accent_color:string; highlight_color:string; background_color:string; surface_color:string;
  announcement_enabled:boolean; announcement_text:string;
  footer_tagline:string; footer_location:string; footer_email:string; instagram_url:string; linkedin_url:string;
  meta_title:string; meta_description:string;
};

type Listing = {
  id: string;
  title: string;
  category: Exclude<Category, "All materials">;
  quantity: string;
  price: string;
  location: string;
  distance: string;
  posted: string;
  seller: string;
  initials: string;
  verified?: boolean;
  image: string;
  accent: string;
  description: string;
};

const categories: { label: Category; icon: string }[] = [
  { label: "All materials", icon: "✦" },
  { label: "Lumber", icon: "▤" },
  { label: "Masonry", icon: "▦" },
  { label: "Fixtures", icon: "◒" },
  { label: "Hardware", icon: "⌁" },
  { label: "Landscaping", icon: "⌂" },
];

const defaultSiteSettings: SiteSettings = {
  hero_eyebrow:'CIRCULAR BUILDING, MADE SIMPLE',hero_title:'Good materials',hero_title_emphasis:'deserve another build.',hero_description:'Find useful leftovers from nearby job sites, or give your own surplus a second life.',
  hero_location_label:'Showing materials near',hero_location:'Austin, Texas',hero_image_url:null,weekly_drop_label:'THE WEEKLY DROP',weekly_drop_title:'From job site to good use.',
  diverted_stat:'12,840 kg',diverted_label:'diverted this month',rehomed_stat:'1,204',rehomed_label:'items rehomed',browse_eyebrow:'JUST IN YOUR AREA',browse_title:'Browse available materials',
  how_eyebrow:'HOW RECLAIM WORKS',how_title:'Keep good stuff',how_title_emphasis:'in the loop.',how_description:'One simple exchange keeps materials out of landfill and helps your next build cost less.',
  logo_url:null,logo_text:'RECLAIM',brand_subtitle:'MATERIALS NETWORK',
  primary_color:'#224a31',accent_color:'#e56d3d',highlight_color:'#b8d668',background_color:'#f4f5f0',surface_color:'#fbfcf8',
  announcement_enabled:false,announcement_text:'',footer_tagline:'A circular marketplace for useful construction materials.',footer_location:'Serving local builders and communities.',footer_email:'',instagram_url:'',linkedin_url:'',
  meta_title:'Reclaim — Materials Network',meta_description:'Find and rehome surplus construction materials near you.'
};

function App() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [category, setCategory] = useState<Category>("All materials");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("Recently added");
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [requested, setRequested] = useState<string[]>([]);
  const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]>(null);
  const [profileName, setProfileName] = useState("Guest");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [activeNav, setActiveNav] = useState("Browse materials");
  const [notice, setNotice] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showWebsiteEditor, setShowWebsiteEditor] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
      const { data: { session: current } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(current);
      if (current?.user) {
        const { data: profile } = await supabase.from("profiles").select("display_name,is_admin").eq("id", current.user.id).maybeSingle();
        setProfileName(profile?.display_name || current.user.email?.split("@")[0] || "Member");
        setIsAdmin(Boolean(profile?.is_admin));
        const { data: savedRows } = await supabase.from("saved_listings").select("listing_id").eq("user_id", current.user.id);
        if (savedRows) setSaved(savedRows.map(r => r.listing_id));
      }
      const { data: settings } = await supabase.from("site_settings").select("*").eq("id",1).maybeSingle();
      if (settings && mounted) setSiteSettings({...defaultSiteSettings,...settings});
      const { data: rows } = await supabase.from("listings").select("*").eq("status", "active").order("created_at", { ascending: false });
      if (mounted && rows) setListings(rows.map(r => ({
        id:r.id,title:r.title,category:r.category as Exclude<Category,"All materials">,quantity:r.quantity,price:r.price,
        location:r.location,distance:"Nearby",posted:"Recently",seller:"Reclaim member",initials:"RM",verified:true,
        image:r.image_url || "",accent:r.category==="Lumber" ? "wood" : r.category.toLowerCase(),
        description:r.description || ""
      })));
      } catch (error) {
        console.error("Reclaim load error:", error);
      }
    };
    load();
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, next) => {
      setSession(next);
      if (!next?.user) {
        setProfileName("Guest");
        setIsAdmin(false);
        setSaved([]);
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("display_name,is_admin").eq("id", next.user.id).maybeSingle();
      setProfileName(profile?.display_name || next.user.email?.split("@")[0] || "Member");
      setIsAdmin(Boolean(profile?.is_admin));
      const { data: savedRows } = await supabase.from("saved_listings").select("listing_id").eq("user_id", next.user.id);
      if (savedRows) setSaved(savedRows.map(r => r.listing_id));
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  const filteredListings = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = listings.filter((listing) => {
      const matchesCategory = category === "All materials" || listing.category === category;
      const matchesSaved = !showSavedOnly || saved.includes(listing.id);
      const matchesSearch =
        !query ||
        [listing.title, listing.category, listing.location, listing.seller].some((field) =>
          field.toLowerCase().includes(query),
        );
      return matchesCategory && matchesSaved && matchesSearch;
    });

    if (sort === "Price: low to high") {
      return [...result].sort((a, b) => (a.price === "Free" ? 0 : 1) - (b.price === "Free" ? 0 : 1));
    }
    if (sort === "Closest first") {
      return [...result].sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    }
    return result;
  }, [category, listings, saved, search, showSavedOnly, sort]);

  const toggleSaved = async (id: string) => {
    if (!session) { setShowAuthModal(true); return; }
    const exists = saved.includes(id);
    setSaved(current => exists ? current.filter(item => item !== id) : [...current, id]);
    if (exists) await supabase.from("saved_listings").delete().eq("user_id", session.user.id).eq("listing_id", id);
    else await supabase.from("saved_listings").insert({ user_id: session.user.id, listing_id: id });
  };

  const requestItem = async (id: string) => {
    if (!session) { setShowAuthModal(true); return; }
    await supabase.from("inquiries").upsert({ listing_id:id, requester_id:session.user.id, message:"I'm interested in this material." }, { onConflict:"listing_id,requester_id" });
    setRequested(current => current.includes(id) ? current : [...current, id]);
    setNotice("Interest sent — the poster will be in touch soon.");
    window.setTimeout(() => setNotice(""), 3500);
  };

  const selectNav = (label: string) => {
    setActiveNav(label);
    if (label === "My listings") {
      if (!session) { setShowAuthModal(true); return; }
      setNotice("Your listings are coming next."); window.setTimeout(() => setNotice(""), 2500);
    }
    if (label === "How it works") {
      document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    document.title = siteSettings.meta_title || "Reclaim — Materials Network";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", siteSettings.meta_description || "");
    else {
      const tag = document.createElement("meta");
      tag.name = "description";
      tag.content = siteSettings.meta_description || "";
      document.head.appendChild(tag);
    }
  }, [siteSettings.meta_title, siteSettings.meta_description]);

  const themeStyle = {
    "--green": siteSettings.primary_color,
    "--orange": siteSettings.accent_color,
    "--green-bright": siteSettings.highlight_color,
    "--cream": siteSettings.background_color,
    "--paper": siteSettings.surface_color,
  } as CSSProperties;

  return (
    <div className="app-shell" style={themeStyle}>
      {siteSettings.announcement_enabled && siteSettings.announcement_text && (
        <div className="site-announcement">{siteSettings.announcement_text}</div>
      )}
      <header className="topbar">
        <div className="brand" onClick={() => selectNav("Browse materials")} role="button" tabIndex={0}>
          <span className="brand-mark">
            {siteSettings.logo_url ? <img src={siteSettings.logo_url} alt="" /> : <Leaf size={17} strokeWidth={2.5} />}
          </span>
          <span className="brand-name">{siteSettings.logo_text}</span>
          <span className="brand-divider" />
          <span className="brand-subtitle">{siteSettings.brand_subtitle}</span>
        </div>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {["Browse materials", "My listings", "How it works"].map((item) => (
            <button
              className={activeNav === item ? "nav-link active" : "nav-link"}
              key={item}
              onClick={() => selectNav(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="topbar-actions">
          <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotice("You are all caught up.")}>
            <Bell size={18} />
            <span className="notification-dot" />
          </button>
          {!session && <button className="login-button" onClick={() => setShowAuthModal(true)}><LogIn size={16} /> Log in</button>}
          <button className="profile-chip" onClick={() => isAdmin && setShowAdmin(true)} title={isAdmin ? "Open admin panel" : undefined}>
            <span className="profile-avatar">{session ? profileName.slice(0,2).toUpperCase() : "GU"}</span>
            <span className="profile-name">{session ? profileName : "Guest"}</span>{isAdmin && <span className="admin-badge">ADMIN</span>}
            <ChevronDown size={15} />
          </button>
          <button className="mobile-menu-button icon-button" aria-label="Open menu" onClick={() => setShowMenu(!showMenu)}>
            <Menu size={20} />
          </button>
          <button className="primary-button post-button" onClick={() => session ? setShowPostModal(true) : setShowAuthModal(true)}>
            <Plus size={17} strokeWidth={2.5} />
            Post material
          </button>
        </div>
      </header>

      {showMenu && (
        <div className="mobile-nav">
          {["Browse materials", "My listings", "How it works"].map((item) => (
            <button key={item} onClick={() => { selectNav(item); setShowMenu(false); }}>{item}</button>
          ))}
        </div>
      )}

      <main>
        <section className="hero-section page-width">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> {siteSettings.hero_eyebrow}</div>
            <h1>{siteSettings.hero_title}<br /><em>{siteSettings.hero_title_emphasis}</em></h1>
            <p className="hero-description">{siteSettings.hero_description}</p>
            <div className="location-select">
              <span className="location-icon"><MapPin size={16} /></span>
              <span><small>{siteSettings.hero_location_label}</small><strong>{siteSettings.hero_location}</strong></span>
              <ChevronDown size={16} className="location-chevron" />
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-blob blob-one" />
            <div className="hero-blob blob-two" />
            <div className="hero-material-card">
              <div className="material-photo hero-photo" style={siteSettings.hero_image_url ? {backgroundImage: "url(" + siteSettings.hero_image_url + ")"} : undefined} />
              <div className="hero-card-label"><span className="status-dot" /> 24 materials nearby</div>
              <div className="hero-card-caption"><span>{siteSettings.weekly_drop_label}</span><strong>{siteSettings.weekly_drop_title}</strong></div>
            </div>
            <div className="floating-stat stat-top"><span className="stat-icon green"><Leaf size={16} /></span><span><strong>{siteSettings.diverted_stat}</strong><small>{siteSettings.diverted_label}</small></span></div>
            <div className="floating-stat stat-bottom"><span className="stat-icon orange"><PackageCheck size={16} /></span><span><strong>{siteSettings.rehomed_stat}</strong><small>{siteSettings.rehomed_label}</small></span></div>
          </div>
        </section>

        <section className="browse-section page-width" id="browse">
          <div className="section-heading">
            <div>
              <div className="eyebrow muted-eyebrow"><span className="eyebrow-line" /> {siteSettings.browse_eyebrow}</div>
              <h2>{siteSettings.browse_title}</h2>
            </div>
            <button className="text-button" onClick={() => { setCategory("All materials"); setSearch(""); setShowSavedOnly(false); }}>View all materials <ArrowRight size={16} /></button>
          </div>

          <div className="search-bar-row">
            <div className="search-field">
              <Search size={19} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search bricks, timber, tiles..." aria-label="Search materials" />
              {search && <button className="clear-search" onClick={() => setSearch("")} aria-label="Clear search"><X size={15} /></button>}
              <span className="search-shortcut">⌘ K</span>
            </div>
            <button className={showFilters ? "filter-button active" : "filter-button"} onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={17} /> Filters <span className="filter-count">2</span></button>
            <label className="sort-control"><span>Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option>Recently added</option><option>Closest first</option><option>Price: low to high</option></select><ChevronDown size={15} /></label>
          </div>

          {showFilters && (
            <div className="filter-panel">
              <div className="filter-panel-copy"><strong>Refine your search</strong><span>Showing items available for pickup</span></div>
              <div className="filter-toggle-row"><button className="filter-toggle selected"><span className="toggle-check"><Check size={12} /></span>Free only</button><button className="filter-toggle"><span className="toggle-empty" />Available this week</button><button className="filter-toggle"><span className="toggle-empty" />Verified posters</button></div>
              <button className="filter-clear" onClick={() => setShowFilters(false)}>Done</button>
            </div>
          )}

          <div className="category-row">
            <div className="category-pills">
              {categories.map((item) => <button key={item.label} className={category === item.label ? "category-pill active" : "category-pill"} onClick={() => setCategory(item.label)}><span>{item.icon}</span>{item.label}</button>)}
            </div>
            <button className={showSavedOnly ? "saved-filter active" : "saved-filter"} onClick={() => setShowSavedOnly(!showSavedOnly)}><Heart size={15} fill={showSavedOnly ? "currentColor" : "none"} /> Saved ({saved.length})</button>
          </div>

          <div className="results-meta"><span><strong>{filteredListings.length}</strong> materials available</span><span className="results-location"><LocateFixed size={14} /> Within 15 miles of Austin</span></div>

          {filteredListings.length > 0 ? (
            <div className="listing-grid">
              {filteredListings.map((listing) => <ListingCard key={listing.id} listing={listing} isSaved={saved.includes(listing.id)} isRequested={requested.includes(listing.id)} onToggleSaved={toggleSaved} onRequest={requestItem} />)}
              <div className="post-prompt-card"><div className="prompt-icon"><Sparkles size={18} /></div><strong>Have materials<br />to share?</strong><p>Turn your surplus into someone else's next project.</p><button onClick={() => setShowPostModal(true)}>Post an item <ArrowRight size={15} /></button></div>
            </div>
          ) : (
            <div className="empty-state"><div className="empty-icon"><Search size={24} /></div><h3>No materials found</h3><p>Try a different search or browse all categories.</p><button className="secondary-button" onClick={() => { setCategory("All materials"); setSearch(""); setShowSavedOnly(false); }}>Clear filters</button></div>
          )}
        </section>

        <section className="how-section page-width" id="how-it-works">
          <div className="how-intro"><div className="eyebrow"><span className="eyebrow-line" /> {siteSettings.how_eyebrow}</div><h2>{siteSettings.how_title}<br /><em>{siteSettings.how_title_emphasis}</em></h2><p>{siteSettings.how_description}</p><button className="text-button">Learn more <ArrowRight size={16} /></button></div>
          <div className="steps-grid"><div className="step-card"><span className="step-number">01</span><span className="step-icon"><Upload size={21} /></span><h3>Post what you have</h3><p>Snap a photo, add the details, and let your local network know what's available.</p></div><div className="step-card featured"><span className="step-number">02</span><span className="step-icon"><Search size={21} /></span><h3>Find what you need</h3><p>Browse useful materials near you and connect directly with the person posting them.</p></div><div className="step-card"><span className="step-number">03</span><span className="step-icon"><Truck size={21} /></span><h3>Pick it up & build</h3><p>Arrange a pickup, give it a second life, and keep the circle moving forward.</p></div></div>
        </section>

        <section className="trust-strip page-width"><div className="trust-item"><ShieldCheck size={18} /><span><strong>Built for builders</strong> Verified people, real materials</span></div><div className="trust-item"><Leaf size={18} /><span><strong>Waste less together</strong> Every exchange makes an impact</span></div><div className="trust-item"><CircleHelp size={18} /><span><strong>Need a hand?</strong> Our team is here to help</span></div></section>
      </main>
      <footer className="site-footer">
        <div className="page-width site-footer-grid">
          <div><div className="footer-brand">{siteSettings.logo_text}</div><p>{siteSettings.footer_tagline}</p></div>
          <div><strong>Reclaim</strong><span>{siteSettings.footer_location}</span>{siteSettings.footer_email && <a href={"mailto:"+siteSettings.footer_email}>{siteSettings.footer_email}</a>}</div>
          <div><strong>Follow</strong>{siteSettings.instagram_url && <a href={siteSettings.instagram_url} target="_blank" rel="noreferrer">Instagram</a>}{siteSettings.linkedin_url && <a href={siteSettings.linkedin_url} target="_blank" rel="noreferrer">LinkedIn</a>}</div>
        </div>
      </footer>

      {showAdmin && isAdmin && <AdminPanel onClose={() => setShowAdmin(false)} onWebsite={() => { setShowAdmin(false); setShowWebsiteEditor(true); }} onNotice={(message) => { setShowAdmin(false); setNotice(message); window.setTimeout(() => setNotice(""), 3000); }} />}
      {showWebsiteEditor && isAdmin && <WebsiteEditor initial={siteSettings} onClose={() => setShowWebsiteEditor(false)} onSaved={(next) => { setSiteSettings(next); setShowWebsiteEditor(false); setNotice("Website updated live."); window.setTimeout(() => setNotice(""), 3000); }} />}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onSignedIn={(name, admin) => { setProfileName(name); setIsAdmin(admin); setShowAuthModal(false); }} />}\n      {notice && <div className="toast"><span className="toast-check"><Check size={15} /></span>{notice}<button onClick={() => setNotice("")}><X size={14} /></button></div>}
      {showPostModal && <PostMaterialModal onClose={() => setShowPostModal(false)} onSubmit={async (form, file) => {
          if (!session) { setShowAuthModal(true); return; }
          let imageUrl = "";
          if (file) {
            const path = session.user.id + "/" + crypto.randomUUID() + "-" + file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const upload = await supabase.storage.from("listing-images").upload(path, file);
            if (upload.error) { setNotice("Image upload failed."); return; }
            imageUrl = supabase.storage.from("listing-images").getPublicUrl(path).data.publicUrl;
          }
          const { data, error } = await supabase.from("listings").insert({
            owner_id: session.user.id, title: form.title || "New construction material", category: form.category,
            quantity: form.quantity || "Available for pickup", price: form.price, location: form.location || "Austin",
            description: form.description || "Shared by a local builder through Reclaim.", image_url: imageUrl || null
          }).select("*").single();
          if (error || !data) { setNotice(error?.message || "Could not publish material."); return; }
          setListings(current => [{id:data.id,title:data.title,category:data.category as Exclude<Category,"All materials">,quantity:data.quantity,price:data.price,location:data.location,distance:"Nearby",posted:"Just now",seller:profileName,initials:profileName.slice(0,2).toUpperCase(),verified:true,image:data.image_url||"",accent:data.category==="Lumber"?"wood":data.category.toLowerCase(),description:data.description||""}, ...current]);
          setShowPostModal(false); setNotice("Your material is now live."); window.setTimeout(() => setNotice(""), 4000);
        }} />}
    </div>
  );
}


function AdminPanel({ onClose, onWebsite, onNotice }: { onClose: () => void; onWebsite: () => void; onNotice: (message: string) => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("listings").select("*").order("created_at", { ascending: false });
    if (!error) setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase.from("listings").update({ title: editing.title, category: editing.category, quantity: editing.quantity, price: editing.price, location: editing.location, description: editing.description, updated_at: new Date().toISOString() }).eq("id", editing.id);
    setSaving(false);
    if (error) { onNotice(error.message); return; }
    setRows(current => current.map(row => row.id === editing.id ? editing : row));
    setEditing(null); onNotice("Listing updated.");
  };
  const setStatus = async (id: string, status: "active"|"sold"|"archived") => {
    const { error } = await supabase.from("listings").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { onNotice(error.message); return; }
    setRows(current => current.map(row => row.id === id ? { ...row, status } : row));
    onNotice(status === "active" ? "Listing approved." : status === "sold" ? "Listing marked sold." : "Listing archived.");
  };
  const remove = async (id: string) => {
    if (!window.confirm("Delete this listing permanently?")) return;
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) { onNotice(error.message); return; }
    setRows(current => current.filter(row => row.id !== id)); onNotice("Listing deleted.");
  };

  return <div className="modal-backdrop"><div className="admin-card" role="dialog" aria-modal="true">
    <div className="admin-header"><div><div className="eyebrow muted-eyebrow"><span className="eyebrow-line" /> RECLAIM CONTROL</div><h2>Admin dashboard</h2><p>Manage every marketplace listing directly from Supabase.</p></div><button className="modal-close" onClick={onClose}><X size={19}/></button></div>
    <div className="admin-toolbar"><button className="primary-button" onClick={onWebsite}>🎨 Website Editor</button></div>
    <div className="admin-stats"><div><strong>{rows.length}</strong><span>Total listings</span></div><div><strong>{rows.filter(r=>r.status==="active").length}</strong><span>Live</span></div><div><strong>{rows.filter(r=>r.status==="sold").length}</strong><span>Sold</span></div><div><strong>{rows.filter(r=>r.status==="archived").length}</strong><span>Archived</span></div></div>
    {loading ? <div className="admin-empty">Loading listings…</div> : rows.length === 0 ? <div className="admin-empty"><PackageCheck size={28}/><h3>No listings yet</h3><p>Real user-submitted materials will appear here.</p></div> : <div className="admin-list">{rows.map(row => <div className="admin-row" key={row.id}><div className="admin-thumb" style={{backgroundImage: row.image_url ? `url(${row.image_url})` : undefined}}><PackageCheck size={20}/></div><div className="admin-info"><strong>{row.title}</strong><span>{row.category} · {row.quantity} · {row.price}</span><small>{row.location} · {row.status}</small></div><div className="admin-actions"><button onClick={()=>setEditing({...row})}>Edit</button>{row.status !== "active" && <button onClick={()=>setStatus(row.id,"active")}>Approve</button>}{row.status === "active" && <button onClick={()=>setStatus(row.id,"sold")}>Sold</button>}{row.status !== "archived" && <button onClick={()=>setStatus(row.id,"archived")}>Archive</button>}<button className="danger" onClick={()=>remove(row.id)}>Delete</button></div></div>)}</div>}
    {editing && <div className="admin-edit"><div className="admin-edit-header"><h3>Edit listing</h3><button className="modal-close" onClick={()=>setEditing(null)}><X size={17}/></button></div><div className="form-grid"><label className="form-field wide"><span>Title</span><input value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})}/></label><label className="form-field"><span>Category</span><select value={editing.category} onChange={e=>setEditing({...editing,category:e.target.value})}>{categories.slice(1).map(x=><option key={x.label}>{x.label}</option>)}</select></label><label className="form-field"><span>Quantity</span><input value={editing.quantity} onChange={e=>setEditing({...editing,quantity:e.target.value})}/></label><label className="form-field"><span>Price</span><input value={editing.price} onChange={e=>setEditing({...editing,price:e.target.value})}/></label><label className="form-field"><span>Location</span><input value={editing.location} onChange={e=>setEditing({...editing,location:e.target.value})}/></label><label className="form-field wide"><span>Description</span><textarea rows={4} value={editing.description || ""} onChange={e=>setEditing({...editing,description:e.target.value})}/></label></div><div className="modal-actions"><span>Changes are saved to the live marketplace.</span><div><button className="secondary-button" onClick={()=>setEditing(null)}>Cancel</button><button className="primary-button" onClick={save}>{saving ? "Saving…" : "Save changes"}</button></div></div></div>}
  </div></div>;
}


function WebsiteEditor({initial,onClose,onSaved}:{initial:SiteSettings;onClose:()=>void;onSaved:(next:SiteSettings)=>void}) {
  const [form,setForm]=useState<SiteSettings>(initial);
  const [saving,setSaving]=useState(false); const [uploading,setUploading]=useState(false);
  const update=(key:keyof SiteSettings,value:string|boolean)=>setForm(v=>({...v,[key]:value}));
  const uploadFile=async(e:ChangeEvent<HTMLInputElement>,field:"hero_image_url"|"logo_url")=>{const file=e.target.files?.[0];if(!file)return;setUploading(true);const {data:{session}}=await supabase.auth.getSession();if(!session){setUploading(false);return;}const path=session.user.id+"/site-"+field+"-"+crypto.randomUUID()+"-"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_");const up=await supabase.storage.from("listing-images").upload(path,file,{upsert:true});if(!up.error)update(field,supabase.storage.from("listing-images").getPublicUrl(path).data.publicUrl);setUploading(false);};
  const save=async()=>{setSaving(true);const {error}=await supabase.from("site_settings").upsert({...form,id:1,updated_at:new Date().toISOString()});setSaving(false);if(error){alert(error.message);return;}onSaved(form);};
  return <div className="modal-backdrop"><div className="website-editor-card" role="dialog" aria-modal="true">
    <div className="admin-header"><div><div className="eyebrow muted-eyebrow"><span className="eyebrow-line"/> WEBSITE CONTROL</div><h2>Website Editor</h2><p>Edit the live Reclaim homepage without touching code.</p></div><button className="modal-close" onClick={onClose}><X size={19}/></button></div>
    <div className="website-editor-scroll">
      <div className="editor-section"><h3>Hero section</h3><div className="form-grid">
        <label className="form-field wide"><span>Eyebrow</span><input value={form.hero_eyebrow} onChange={e=>update("hero_eyebrow",e.target.value)}/></label>
        <label className="form-field"><span>Main heading</span><input value={form.hero_title} onChange={e=>update("hero_title",e.target.value)}/></label>
        <label className="form-field"><span>Emphasis heading</span><input value={form.hero_title_emphasis} onChange={e=>update("hero_title_emphasis",e.target.value)}/></label>
        <label className="form-field wide"><span>Description</span><textarea rows={3} value={form.hero_description} onChange={e=>update("hero_description",e.target.value)}/></label>
        <label className="form-field"><span>Location label</span><input value={form.hero_location_label} onChange={e=>update("hero_location_label",e.target.value)}/></label>
        <label className="form-field"><span>Location</span><input value={form.hero_location} onChange={e=>update("hero_location",e.target.value)}/></label>
        <label className="form-field"><span>Weekly drop label</span><input value={form.weekly_drop_label} onChange={e=>update("weekly_drop_label",e.target.value)}/></label>
        <label className="form-field"><span>Weekly drop title</span><input value={form.weekly_drop_title} onChange={e=>update("weekly_drop_title",e.target.value)}/></label>
        <label className="form-field"><span>Diverted statistic</span><input value={form.diverted_stat} onChange={e=>update("diverted_stat",e.target.value)}/></label>
        <label className="form-field"><span>Diverted label</span><input value={form.diverted_label} onChange={e=>update("diverted_label",e.target.value)}/></label>
        <label className="form-field"><span>Rehomed statistic</span><input value={form.rehomed_stat} onChange={e=>update("rehomed_stat",e.target.value)}/></label>
        <label className="form-field"><span>Rehomed label</span><input value={form.rehomed_label} onChange={e=>update("rehomed_label",e.target.value)}/></label>
      </div></div>
      <div className="editor-section"><h3>Branding & graphics</h3>
        <div className="form-grid">
          <label className="form-field"><span>Logo text</span><input value={form.logo_text} onChange={e=>update("logo_text",e.target.value)}/></label>
          <label className="form-field"><span>Brand subtitle</span><input value={form.brand_subtitle} onChange={e=>update("brand_subtitle",e.target.value)}/></label>
        </div>
        <div className="editor-upload logo-upload" style={form.logo_url?{backgroundImage:"url("+form.logo_url+")"}:undefined}><input id="logo-upload" type="file" accept="image/*" onChange={e=>uploadFile(e,"logo_url")} hidden/><label htmlFor="logo-upload"><ImagePlus size={20}/><strong>{uploading?"Uploading…":"Upload logo"}</strong><small>PNG or SVG with a transparent background works best.</small></label></div>
        <div className="editor-upload" style={form.hero_image_url?{backgroundImage:"url("+form.hero_image_url+")"}:undefined}><input id="hero-upload" type="file" accept="image/*" onChange={e=>uploadFile(e,"hero_image_url")} hidden/><label htmlFor="hero-upload"><ImagePlus size={20}/><strong>{uploading?"Uploading…":"Replace hero image"}</strong><small>Use a strong construction/material photo.</small></label></div>
      </div>
      <div className="editor-section"><h3>Brand colors</h3><div className="color-editor-grid">
        <label><span>Primary</span><input type="color" value={form.primary_color} onChange={e=>update("primary_color",e.target.value)}/><code>{form.primary_color}</code></label>
        <label><span>Accent</span><input type="color" value={form.accent_color} onChange={e=>update("accent_color",e.target.value)}/><code>{form.accent_color}</code></label>
        <label><span>Highlight</span><input type="color" value={form.highlight_color} onChange={e=>update("highlight_color",e.target.value)}/><code>{form.highlight_color}</code></label>
        <label><span>Background</span><input type="color" value={form.background_color} onChange={e=>update("background_color",e.target.value)}/><code>{form.background_color}</code></label>
        <label><span>Surface</span><input type="color" value={form.surface_color} onChange={e=>update("surface_color",e.target.value)}/><code>{form.surface_color}</code></label>
      </div></div>
      <div className="editor-section"><h3>Browse section</h3><div className="form-grid"><label className="form-field"><span>Eyebrow</span><input value={form.browse_eyebrow} onChange={e=>update("browse_eyebrow",e.target.value)}/></label><label className="form-field"><span>Heading</span><input value={form.browse_title} onChange={e=>update("browse_title",e.target.value)}/></label></div></div>
      <div className="editor-section"><h3>How it works</h3><div className="form-grid"><label className="form-field"><span>Eyebrow</span><input value={form.how_eyebrow} onChange={e=>update("how_eyebrow",e.target.value)}/></label><label className="form-field"><span>Heading</span><input value={form.how_title} onChange={e=>update("how_title",e.target.value)}/></label><label className="form-field"><span>Emphasis</span><input value={form.how_title_emphasis} onChange={e=>update("how_title_emphasis",e.target.value)}/></label><label className="form-field wide"><span>Description</span><textarea rows={3} value={form.how_description} onChange={e=>update("how_description",e.target.value)}/></label></div></div>
      <div className="editor-section"><h3>Announcement bar</h3><div className="form-grid"><label className="form-field wide"><span>Message</span><input value={form.announcement_text} onChange={e=>update("announcement_text",e.target.value)}/></label><label className="check-field"><input type="checkbox" checked={form.announcement_enabled} onChange={e=>update("announcement_enabled",e.target.checked)}/><span>Show announcement at the top of the website</span></label></div></div>
      <div className="editor-section"><h3>Footer & contact</h3><div className="form-grid"><label className="form-field wide"><span>Tagline</span><input value={form.footer_tagline} onChange={e=>update("footer_tagline",e.target.value)}/></label><label className="form-field"><span>Location</span><input value={form.footer_location} onChange={e=>update("footer_location",e.target.value)}/></label><label className="form-field"><span>Email</span><input value={form.footer_email} onChange={e=>update("footer_email",e.target.value)}/></label><label className="form-field"><span>Instagram URL</span><input value={form.instagram_url} onChange={e=>update("instagram_url",e.target.value)}/></label><label className="form-field"><span>LinkedIn URL</span><input value={form.linkedin_url} onChange={e=>update("linkedin_url",e.target.value)}/></label></div></div>
      <div className="editor-section"><h3>Search & SEO</h3><div className="form-grid"><label className="form-field wide"><span>Browser title</span><input value={form.meta_title} onChange={e=>update("meta_title",e.target.value)}/></label><label className="form-field wide"><span>Meta description</span><textarea rows={3} value={form.meta_description} onChange={e=>update("meta_description",e.target.value)}/></label></div></div>
    </div>
    <div className="modal-actions"><span>Changes publish to the live homepage.</span><div><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={save}>{saving?"Publishing…":"Save & publish"}</button></div></div>
  </div></div>;
}

function ListingCard({ listing, isSaved, isRequested, onToggleSaved, onRequest }: { listing: Listing; isSaved: boolean; isRequested: boolean; onToggleSaved: (id: string) => void; onRequest: (id: string) => void }) {
  return <article className="listing-card">
    <div className={`listing-image ${listing.accent}`} style={{ backgroundImage: `url(${listing.image})` }}>
      <div className="listing-topline"><span className="availability-badge"><span className="status-dot" /> Available</span><button className={isSaved ? "save-button saved" : "save-button"} onClick={() => onToggleSaved(listing.id)} aria-label={isSaved ? `Remove ${listing.title} from saved` : `Save ${listing.title}`}><Heart size={17} fill={isSaved ? "currentColor" : "none"} /></button></div>
      <span className="distance-badge"><MapPin size={12} /> {listing.distance}</span>
    </div>
    <div className="listing-content"><div className="listing-category">{listing.category}</div><div className="listing-title-row"><h3>{listing.title}</h3><span className="listing-price">{listing.price}</span></div><p className="listing-quantity">{listing.quantity}</p><p className="listing-description">{listing.description}</p><div className="listing-footer"><div className="seller"><span className={`seller-avatar avatar-${listing.accent}`}>{listing.initials}</span><span><strong>{listing.seller}</strong><small>{listing.location} · {listing.posted}{listing.verified && <><span className="verified-dot">✓</span> Verified</>}</small></span></div><button className={isRequested ? "interest-button sent" : "interest-button"} onClick={() => onRequest(listing.id)}>{isRequested ? <><Check size={14} /> Sent</> : "I'm interested"}</button></div></div>
  </article>;
}

function PostMaterialModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (form: {title:string;category:Exclude<Category,"All materials">;quantity:string;price:string;location:string;description:string}, file: File | null) => void }) {
  const [form, setForm] = useState({ title: "", category: "Lumber" as Exclude<Category, "All materials">, quantity: "", price: "Free", location: "", description: "" });
  const [preview, setPreview] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const handleImage = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) setPreview(URL.createObjectURL(file)); };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(form, fileInput.current?.files?.[0] || null);
  };

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="post-modal-title"><div className="modal-header"><div><div className="eyebrow muted-eyebrow"><span className="eyebrow-line" /> SHARE THE SURPLUS</div><h2 id="post-modal-title">Post a material</h2><p>Help another build get off the ground.</p></div><button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button></div><form onSubmit={submit}><div className="form-photo-upload" style={preview ? { backgroundImage: `linear-gradient(#1c251d33,#1c251d33), url(${preview})` } : undefined} onClick={() => fileInput.current?.click()}><input ref={fileInput} type="file" accept="image/*" onChange={handleImage} hidden />{preview ? <div className="photo-selected"><Check size={16} /> Photo added · change photo</div> : <><span className="upload-icon"><ImagePlus size={20} /></span><strong>Add a photo</strong><small>A clear photo helps materials find a new home</small></>}</div><div className="form-grid"><label className="form-field wide"><span>What are you sharing? <b>*</b></span><input required value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. Leftover cedar fence boards" /></label><label className="form-field"><span>Category <b>*</b></span><span className="select-wrap"><select required value={form.category} onChange={(event) => update("category", event.target.value)}>{categories.slice(1).map((item) => <option key={item.label}>{item.label}</option>)}</select><ChevronDown size={15} /></span></label><label className="form-field"><span>Quantity <b>*</b></span><input required value={form.quantity} onChange={(event) => update("quantity", event.target.value)} placeholder="e.g. 12 boards" /></label><label className="form-field"><span>Pickup location <b>*</b></span><input required value={form.location} onChange={(event) => update("location", event.target.value)} placeholder="Neighborhood or ZIP" /></label><label className="form-field"><span>Price</span><span className="select-wrap"><select value={form.price} onChange={(event) => update("price", event.target.value)}><option>Free</option><option>$20 / lot</option><option>$50 / lot</option><option>Make an offer</option></select><ChevronDown size={15} /></span></label><label className="form-field wide"><span>Short description</span><textarea value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Condition, dimensions, pickup notes..." rows={3} /></label></div><div className="modal-actions"><span><ShieldCheck size={15} /> Your contact details stay private until you connect.</span><div><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Plus size={16} /> Publish material</button></div></div></form></div></div>;
}

function AuthModal({onClose,onSignedIn}:{onClose:()=>void;onSignedIn:(name:string, isAdmin:boolean)=>void}) {
  const [mode,setMode]=useState<"login"|"signup">("login");
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [name,setName]=useState(""); const [error,setError]=useState("");
  const submit=async(e:FormEvent)=>{e.preventDefault();setError("");
    if(mode==="signup"){const {data,error}=await supabase.auth.signUp({email,password});if(error){setError(error.message);return;}if(data.user){const displayName=name.trim()||email.split("@")[0];const {data:profile}=await supabase.from("profiles").upsert({id:data.user.id,display_name:displayName}).select("is_admin").single();onSignedIn(displayName,Boolean(profile?.is_admin));}}
    else{const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error){setError(error.message);return;}const {data:profile}=await supabase.from("profiles").select("is_admin,display_name").eq("id",data.user.id).maybeSingle();onSignedIn(profile?.display_name||data.user?.email?.split("@")[0]||"Member",Boolean(profile?.is_admin));}
  };
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal-card" role="dialog" aria-modal="true">
    <div className="modal-header"><div><div className="eyebrow muted-eyebrow"><span className="eyebrow-line"/> RECLAIM MEMBERS</div><h2>{mode==="login"?"Welcome back":"Join Reclaim"}</h2></div><button className="modal-close" onClick={onClose}><X size={19}/></button></div>
    <form onSubmit={submit}>{mode==="signup"&&<label className="form-field wide"><span>Name</span><input value={name} onChange={e=>setName(e.target.value)}/></label>}
      <label className="form-field wide"><span>Email</span><input required type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label className="form-field wide"><span>Password</span><input required minLength={6} type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
      {error&&<p className="auth-error">{error}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setMode(mode==="login"?"signup":"login")}>{mode==="login"?"Create account":"Sign in instead"}</button><button type="submit" className="primary-button">{mode==="login"?"Sign in":"Create account"}</button></div>
    </form></div></div>;
}
export default App;
