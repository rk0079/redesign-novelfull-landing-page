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

const initialListings: Listing[] = [
  {
    id: "1",
    title: "Reclaimed red brick",
    category: "Masonry",
    quantity: "280 bricks",
    price: "Free",
    location: "East Austin",
    distance: "3.2 mi",
    posted: "2h ago",
    seller: "Harbor & Sons",
    initials: "HS",
    verified: true,
    image:
      "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=900&q=85",
    accent: "clay",
    description: "Clean, full-size bricks from a recent renovation. A few have light mortar residue.",
  },
  {
    id: "2",
    title: "Structural pine boards",
    category: "Lumber",
    quantity: "34 boards · 2x6",
    price: "$120 / lot",
    location: "South Congress",
    distance: "4.8 mi",
    posted: "5h ago",
    seller: "Mason Creek Build Co.",
    initials: "MC",
    verified: true,
    image:
      "https://images.unsplash.com/photo-1541971875076-8f970d573be6?auto=format&fit=crop&w=900&q=85",
    accent: "wood",
    description: "Straight, dry pine boards left over from framing. Pickup with a truck or trailer.",
  },
  {
    id: "3",
    title: "Porcelain floor tile",
    category: "Fixtures",
    quantity: "18 boxes · 220 sq ft",
    price: "Free",
    location: "Mueller",
    distance: "6.1 mi",
    posted: "Yesterday",
    seller: "Atelier North",
    initials: "AN",
    image:
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=85",
    accent: "tile",
    description: "Matte limestone-look porcelain tile in unopened boxes. Pickup available this weekend.",
  },
  {
    id: "4",
    title: "Steel angle offcuts",
    category: "Hardware",
    quantity: "16 lengths · 6 ft",
    price: "$45 / lot",
    location: "North Loop",
    distance: "7.4 mi",
    posted: "Yesterday",
    seller: "Forge Workshop",
    initials: "FW",
    image:
      "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=900&q=85",
    accent: "steel",
    description: "Powder-coated steel angle offcuts, ideal for brackets, shelving, or small fabrication jobs.",
  },
  {
    id: "5",
    title: "Concrete garden pavers",
    category: "Landscaping",
    quantity: "64 pavers · 24 in",
    price: "Free",
    location: "Bouldin Creek",
    distance: "8.2 mi",
    posted: "2d ago",
    seller: "Good Ground Landscapes",
    initials: "GG",
    verified: true,
    image:
      "https://images.unsplash.com/photo-1598902108854-10e335adac99?auto=format&fit=crop&w=900&q=85",
    accent: "stone",
    description: "Lightly used concrete pavers from a patio refresh. Some color variation, lots of character.",
  },
  {
    id: "6",
    title: "Exterior-grade plywood",
    category: "Lumber",
    quantity: "12 sheets · 4x8",
    price: "$60 / lot",
    location: "Riverside",
    distance: "9.6 mi",
    posted: "3d ago",
    seller: "Fieldline Contractors",
    initials: "FC",
    image:
      "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=900&q=85",
    accent: "plywood",
    description: "Half-inch exterior plywood sheets. Stored under cover and ready for pickup.",
  },
];

const categories: { label: Category; icon: string }[] = [
  { label: "All materials", icon: "✦" },
  { label: "Lumber", icon: "▤" },
  { label: "Masonry", icon: "▦" },
  { label: "Fixtures", icon: "◒" },
  { label: "Hardware", icon: "⌁" },
  { label: "Landscaping", icon: "⌂" },
];

function App() {
  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [category, setCategory] = useState<Category>("All materials");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("Recently added");
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [saved, setSaved] = useState<string[]>(["2", "5"]);
  const [requested, setRequested] = useState<string[]>([]);
  const [session, setSession] = useState<Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]>(null);
  const [profileName, setProfileName] = useState("Guest");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [activeNav, setActiveNav] = useState("Browse materials");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { session: current } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(current);
      if (current?.user) {
        const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", current.user.id).maybeSingle();
        setProfileName(profile?.display_name || current.user.email?.split("@")[0] || "Member");
        const { data: savedRows } = await supabase.from("saved_listings").select("listing_id").eq("user_id", current.user.id);
        if (savedRows) setSaved(savedRows.map(r => r.listing_id));
      }
      const { data: rows } = await supabase.from("listings").select("*").eq("status", "active").order("created_at", { ascending: false });
      if (mounted && rows?.length) setListings(rows.map(r => ({
        id:r.id,title:r.title,category:r.category as Exclude<Category,"All materials">,quantity:r.quantity,price:r.price,
        location:r.location,distance:"Nearby",posted:"Recently",seller:"Reclaim member",initials:"RM",verified:true,
        image:r.image_url || initialListings[0].image,accent:r.category==="Lumber" ? "wood" : r.category.toLowerCase(),
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
      setNotice("Your listings dashboard is coming next — post a material to get started.");
      window.setTimeout(() => setNotice(""), 3500);
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
          <div className="profile-chip">
            <span className="profile-avatar">{session ? profileName.slice(0,2).toUpperCase() : "GU"}</span>
            <span className="profile-name">{session ? profileName : "Guest"}</span>
            <ChevronDown size={15} />
          </div>
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

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onSignedIn={name => { setProfileName(name); setShowAuthModal(false); }} />}\n      {notice && <div className="toast"><span className="toast-check"><Check size={15} /></span>{notice}<button onClick={() => setNotice("")}><X size={14} /></button></div>}
      {showPostModal && <PostMaterialModal onClose={() => setShowPostModal(false)} onSubmit={(listing) => { setListings((current) => [listing, ...current]); setShowPostModal(false); setNotice("Your material is now live for the Austin network."); window.setTimeout(() => setNotice(""), 4000); }} />}
    </div>
  );
}

function ListingCard({ listing, isSaved, isRequested, onToggleSaved, onRequest }: { listing: Listing; isSaved: boolean; isRequested: boolean; onToggleSaved: (id: string) => void; onRequest: (id: number) => void }) {
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
