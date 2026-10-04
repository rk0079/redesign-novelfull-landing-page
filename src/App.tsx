import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
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

function App() {
  const [listings, setListings] = useState<Listing[]>([]);
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

  useEffect(() => {
    let mounted = true;
    const load = async () => {
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
      const { data: rows } = await supabase.from("listings").select("*").eq("status", "active").order("created_at", { ascending: false });
      if (mounted && rows) setListings(rows.map(r => ({
        id:r.id,title:r.title,category:r.category as Exclude<Category,"All materials">,quantity:r.quantity,price:r.price,
        location:r.location,distance:"Nearby",posted:"Recently",seller:"Reclaim member",initials:"RM",verified:true,
        image:r.image_url || "",accent:r.category==="Lumber" ? "wood" : r.category.toLowerCase(),
        description:r.description || ""
      })));
    };
    load();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" onClick={() => selectNav("Browse materials")} role="button" tabIndex={0}>
          <span className="brand-mark"><Leaf size={17} strokeWidth={2.5} /></span>
          <span className="brand-name">RECLAIM</span>
          <span className="brand-divider" />
          <span className="brand-subtitle">MATERIALS NETWORK</span>
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
            <div className="eyebrow"><span className="eyebrow-line" /> CIRCULAR BUILDING, MADE SIMPLE</div>
            <h1>Good materials<br /><em>deserve another build.</em></h1>
            <p className="hero-description">
              Find useful leftovers from nearby job sites, or give your own surplus a second life.
            </p>
            <div className="location-select">
              <span className="location-icon"><MapPin size={16} /></span>
              <span><small>Showing materials near</small><strong>Austin, Texas</strong></span>
              <ChevronDown size={16} className="location-chevron" />
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-blob blob-one" />
            <div className="hero-blob blob-two" />
            <div className="hero-material-card">
              <div className="material-photo hero-photo" />
              <div className="hero-card-label"><span className="status-dot" /> 24 materials nearby</div>
              <div className="hero-card-caption"><span>THE WEEKLY DROP</span><strong>From job site<br />to good use.</strong></div>
            </div>
            <div className="floating-stat stat-top"><span className="stat-icon green"><Leaf size={16} /></span><span><strong>12,840 kg</strong><small>diverted this month</small></span></div>
            <div className="floating-stat stat-bottom"><span className="stat-icon orange"><PackageCheck size={16} /></span><span><strong>1,204</strong><small>items rehomed</small></span></div>
          </div>
        </section>

        <section className="browse-section page-width" id="browse">
          <div className="section-heading">
            <div>
              <div className="eyebrow muted-eyebrow"><span className="eyebrow-line" /> JUST IN YOUR AREA</div>
              <h2>Browse available materials</h2>
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
          <div className="how-intro"><div className="eyebrow"><span className="eyebrow-line" /> HOW RECLAIM WORKS</div><h2>Keep good stuff<br /><em>in the loop.</em></h2><p>One simple exchange keeps materials out of landfill and helps your next build cost less.</p><button className="text-button">Learn more <ArrowRight size={16} /></button></div>
          <div className="steps-grid"><div className="step-card"><span className="step-number">01</span><span className="step-icon"><Upload size={21} /></span><h3>Post what you have</h3><p>Snap a photo, add the details, and let your local network know what's available.</p></div><div className="step-card featured"><span className="step-number">02</span><span className="step-icon"><Search size={21} /></span><h3>Find what you need</h3><p>Browse useful materials near you and connect directly with the person posting them.</p></div><div className="step-card"><span className="step-number">03</span><span className="step-icon"><Truck size={21} /></span><h3>Pick it up & build</h3><p>Arrange a pickup, give it a second life, and keep the circle moving forward.</p></div></div>
        </section>

        <section className="trust-strip page-width"><div className="trust-item"><ShieldCheck size={18} /><span><strong>Built for builders</strong> Verified people, real materials</span></div><div className="trust-item"><Leaf size={18} /><span><strong>Waste less together</strong> Every exchange makes an impact</span></div><div className="trust-item"><CircleHelp size={18} /><span><strong>Need a hand?</strong> Our team is here to help</span></div></section>
      </main>

      {showAdmin && isAdmin && <AdminPanel onClose={() => setShowAdmin(false)} onNotice={(message) => { setShowAdmin(false); setNotice(message); window.setTimeout(() => setNotice(""), 3000); }} />}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onSignedIn={name => { setProfileName(name); setShowAuthModal(false); }} />}\n      {notice && <div className="toast"><span className="toast-check"><Check size={15} /></span>{notice}<button onClick={() => setNotice("")}><X size={14} /></button></div>}
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


function AdminPanel({ onClose, onNotice }: { onClose: () => void; onNotice: (message: string) => void }) {
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
    <div className="admin-stats"><div><strong>{rows.length}</strong><span>Total listings</span></div><div><strong>{rows.filter(r=>r.status==="active").length}</strong><span>Live</span></div><div><strong>{rows.filter(r=>r.status==="sold").length}</strong><span>Sold</span></div><div><strong>{rows.filter(r=>r.status==="archived").length}</strong><span>Archived</span></div></div>
    {loading ? <div className="admin-empty">Loading listings…</div> : rows.length === 0 ? <div className="admin-empty"><PackageCheck size={28}/><h3>No listings yet</h3><p>Real user-submitted materials will appear here.</p></div> : <div className="admin-list">{rows.map(row => <div className="admin-row" key={row.id}><div className="admin-thumb" style={{backgroundImage: row.image_url ? `url(\${row.image_url})` : undefined}}><PackageCheck size={20}/></div><div className="admin-info"><strong>{row.title}</strong><span>{row.category} · {row.quantity} · {row.price}</span><small>{row.location} · {row.status}</small></div><div className="admin-actions"><button onClick={()=>setEditing({...row})}>Edit</button>{row.status !== "active" && <button onClick={()=>setStatus(row.id,"active")}>Approve</button>}{row.status === "active" && <button onClick={()=>setStatus(row.id,"sold")}>Sold</button>}{row.status !== "archived" && <button onClick={()=>setStatus(row.id,"archived")}>Archive</button>}<button className="danger" onClick={()=>remove(row.id)}>Delete</button></div></div>)}</div>}
    {editing && <div className="admin-edit"><div className="admin-edit-header"><h3>Edit listing</h3><button className="modal-close" onClick={()=>setEditing(null)}><X size={17}/></button></div><div className="form-grid"><label className="form-field wide"><span>Title</span><input value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})}/></label><label className="form-field"><span>Category</span><select value={editing.category} onChange={e=>setEditing({...editing,category:e.target.value})}>{categories.slice(1).map(x=><option key={x.label}>{x.label}</option>)}</select></label><label className="form-field"><span>Quantity</span><input value={editing.quantity} onChange={e=>setEditing({...editing,quantity:e.target.value})}/></label><label className="form-field"><span>Price</span><input value={editing.price} onChange={e=>setEditing({...editing,price:e.target.value})}/></label><label className="form-field"><span>Location</span><input value={editing.location} onChange={e=>setEditing({...editing,location:e.target.value})}/></label><label className="form-field wide"><span>Description</span><textarea rows={4} value={editing.description || ""} onChange={e=>setEditing({...editing,description:e.target.value})}/></label></div><div className="modal-actions"><span>Changes are saved to the live marketplace.</span><div><button className="secondary-button" onClick={()=>setEditing(null)}>Cancel</button><button className="primary-button" onClick={save}>{saving ? "Saving…" : "Save changes"}</button></div></div></div>}
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

function AuthModal({onClose,onSignedIn}:{onClose:()=>void;onSignedIn:(name:string)=>void}) {
  const [mode,setMode]=useState<"login"|"signup">("login");
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [name,setName]=useState(""); const [error,setError]=useState("");
  const submit=async(e:FormEvent)=>{e.preventDefault();setError("");
    if(mode==="signup"){const {data,error}=await supabase.auth.signUp({email,password});if(error){setError(error.message);return;}if(data.user){const displayName=name.trim()||email.split("@")[0];await supabase.from("profiles").upsert({id:data.user.id,display_name:displayName});onSignedIn(displayName);}}
    else{const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error){setError(error.message);return;}onSignedIn(data.user?.email?.split("@")[0]||"Member");}
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
