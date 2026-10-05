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
  Moon,
  Sun,
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

type Category = string;

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
  hero_eyebrow:'THE OPEN REUSE MARKETPLACE',hero_title:'Buy what you need.',hero_title_emphasis:'Sell what you don’t.',hero_description:'Find unused, surplus, leftover and reusable materials from people, projects and businesses near you.',
  hero_location_label:'Showing materials near',hero_location:'Ahmedabad, Gujarat',hero_image_url:null,weekly_drop_label:'THE WEEKLY DROP',weekly_drop_title:'From job site to good use.',
  diverted_stat:'12,840 kg',diverted_label:'diverted this month',rehomed_stat:'1,204',rehomed_label:'items rehomed',browse_eyebrow:'JUST IN YOUR AREA',browse_title:'Browse available materials',
  how_eyebrow:'HOW RECLAIM WORKS',how_title:'Keep good stuff',how_title_emphasis:'in the loop.',how_description:'One simple exchange keeps materials out of landfill and helps your next build cost less.',
  logo_url:null,logo_text:'Reclaim',brand_subtitle:'USEFUL. AGAIN.',
  primary_color:'#224a31',accent_color:'#e56d3d',highlight_color:'#b8d668',background_color:'#f4f5f0',surface_color:'#fbfcf8',
  announcement_enabled:false,announcement_text:'',footer_tagline:'Buy what you need. Sell what you don’t.',footer_location:'Anyone can buy. Anyone can sell. Ahmedabad and beyond.',footer_email:'',instagram_url:'',linkedin_url:'',
  meta_title:'Reclaim — Buy what you need. Sell what you don’t.',meta_description:'A modern open marketplace for useful surplus, leftover, reusable and pre-owned materials.'
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
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("reclaim-night-mode") === "true");
  const [activeNav, setActiveNav] = useState("Browse materials");
  const [notice, setNotice] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showWebsiteEditor, setShowWebsiteEditor] = useState(false);
  const [showRequirementModal, setShowRequirementModal] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("reclaim-night-mode") === "true";
    setDarkMode(saved);
    document.documentElement.classList.toggle("dark-mode", saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("reclaim-night-mode", String(darkMode));
    document.documentElement.classList.toggle("dark-mode", darkMode);
  }, [darkMode]);

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
    return (
    <div className={darkMode ? "app-shell dark-mode" : "app-shell"} style={themeStyle}>
      {siteSettings.announcement_enabled && siteSettings.announcement_text && <div className="site-announcement">{siteSettings.announcement_text}</div>}
      <header className="topbar sl-new-header">
        <button className="brand sl-brand-new" onClick={() => { setActiveNav("Browse materials"); window.scrollTo({top:0,behavior:"smooth"}); }}>
          <span className="sl-mark"><span></span><span></span><span></span></span><span className="brand-name">Reclaim</span>
        </button>
        <nav className="desktop-nav sl-main-nav">
          <button onClick={() => document.getElementById("marketplace")?.scrollIntoView({behavior:"smooth"})}>Marketplace</button>
          <button onClick={() => document.getElementById("categories")?.scrollIntoView({behavior:"smooth"})}>Categories</button>
          <button onClick={() => setShowPostModal(true)}>Sell</button>
          <button onClick={() => setShowRequirementModal(true)}>Post a Requirement</button>
          <button onClick={() => document.getElementById("how-it-works")?.scrollIntoView({behavior:"smooth"})}>How It Works</button>
        </nav>
        <div className="topbar-actions sl-new-actions">
          <button className="sl-location" onClick={() => setNotice("Location: Ahmedabad, Gujarat")}><MapPin size={15}/> Ahmedabad</button>
          <button className="icon-button" onClick={() => setNotice("You are all caught up.")}><Bell size={18}/></button>
          <button className="icon-button" onClick={() => setShowSavedOnly(!showSavedOnly)}><Heart size={18} fill={showSavedOnly ? "currentColor" : "none"}/></button>
          <button className="login-button" onClick={() => session ? setShowAdmin(isAdmin) : setShowAuthModal(true)}><LogIn size={16}/><span className="login-label">{session ? profileName : "Login / Sign Up"}</span></button>
          <button className="primary-button post-button" onClick={() => setShowPostModal(true)}><Plus size={16}/> Sell Something</button>
          <button className="mobile-menu-button icon-button" onClick={() => setShowMenu(!showMenu)}><Menu size={20}/></button>
        </div>
      </header>
      {showMenu && <div className="mobile-nav sl-new-mobile">
        <button onClick={() => document.getElementById("marketplace")?.scrollIntoView({behavior:"smooth"})}>Marketplace</button>
        <button onClick={() => document.getElementById("categories")?.scrollIntoView({behavior:"smooth"})}>Categories</button>
        <button onClick={() => setShowPostModal(true)}>Sell Something</button>
        <button onClick={() => setShowRequirementModal(true)}>Post a Requirement</button>
        <button onClick={() => document.getElementById("how-it-works")?.scrollIntoView({behavior:"smooth"})}>How It Works</button>
        <button onClick={() => setDarkMode(v => !v)}>{darkMode ? <Sun size={17}/> : <Moon size={17}/>} {darkMode ? "Day mode" : "Night mode"}</button>
      </div>}

      <main>
        <section className="sl-hero-new">
          <div className="sl-hero-copy page-width">
            <div className="sl-kicker">THE OPEN REUSE MARKETPLACE</div>
            <h1>Buy what you need.<br/><em>Sell what you don’t.</em></h1>
            <p>Find unused, surplus, leftover and reusable materials from people, projects and businesses near you.</p>
            <div className="sl-hero-search">
              <Search size={21}/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="What are you looking for? Tiles, cables, furniture, pipes, tools…"/>
              <span className="sl-search-location"><MapPin size={14}/> Ahmedabad, Gujarat</span>
              <button onClick={() => document.getElementById("marketplace")?.scrollIntoView({behavior:"smooth"})}>Search</button>
            </div>
            <div className="sl-trust-line"><span>✓ Anyone can buy</span><span>✓ Anyone can sell</span><span>✓ Local pickup & delivery</span></div>
          </div>
          <div className="sl-hero-visual">
            <div className="sl-photo p1"></div><div className="sl-photo p2"></div><div className="sl-photo p3"></div>
            <div className="sl-floating-card"><b>12,840+</b><span>materials getting a second life</span></div>
          </div>
        </section>

        <section className="page-width sl-action-grid">
          <button className="sl-action buy" onClick={() => document.getElementById("marketplace")?.scrollIntoView({behavior:"smooth"})}><span className="sl-action-icon"><Search/></span><div><b>I Want to Buy</b><p>Find useful materials and products at better prices.</p><strong>Explore Marketplace <ArrowRight size={15}/></strong></div></button>
          <button className="sl-action sell" onClick={() => setShowPostModal(true)}><span className="sl-action-icon"><Tag/></span><div><b>I Want to Sell</b><p>Have something useful sitting unused? List it and find a buyer.</p><strong>Sell Something <ArrowRight size={15}/></strong></div></button>
          <button className="sl-action need" onClick={() => setShowRequirementModal(true)}><span className="sl-action-icon"><CircleHelp/></span><div><b>I Need Something</b><p>Can’t find what you’re looking for? Let sellers respond.</p><strong>Post Requirement <ArrowRight size={15}/></strong></div></button>
        </section>

        <section className="page-width sl-section" id="categories">
          <div className="sl-section-head"><div><span className="sl-kicker">WHAT CAN I BUY?</span><h2>Find almost anything useful.</h2><p>From a few leftover tiles to industrial machinery — if it’s useful, it belongs on Reclaim.</p></div><button onClick={() => setShowAllCategories(true)}>View All Categories <ArrowRight size={16}/></button></div>
          <div className="sl-category-grid">{categories.map(c => <button className="sl-category-card" key={c.label} onClick={() => {setCategory(c.label);document.getElementById("marketplace")?.scrollIntoView({behavior:"smooth"});}}><span>{c.icon}</span><b>{c.label}</b><small>{c.label === "Construction & Building" ? "Cement · Tiles · Steel · Doors · Windows" : c.label === "Electrical" ? "Cables · Lights · Panels · Fans · Motors" : c.label === "Plumbing" ? "Pipes · Fittings · Valves · Pumps · Tanks" : c.label === "Home & Interior" ? "Furniture · Plywood · MDF · Decor" : "Tools · stock · equipment · reusable items"}</small><ArrowRight size={15}/></button>)}</div>
        </section>

        <section className="page-width sl-section sl-marketplace" id="marketplace">
          <div className="sl-section-head"><div><span className="sl-kicker">LOCAL MARKETPLACE</span><h2>Discover useful things near you.</h2><p>Search by material, category, price and distance.</p></div><button className="primary-button" onClick={() => setShowPostModal(true)}>+ Sell Something</button></div>
          <div className="sl-market-tools">
            <div className="sl-big-search"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search materials, furniture, tools, equipment…"/></div>
            <select value={category} onChange={e => setCategory(e.target.value as Category)}><option>All materials</option>{categories.map(c => <option key={c.label}>{c.label}</option>)}</select>
            <select value={sort} onChange={e => setSort(e.target.value)}><option>Recommended</option><option>Closest first</option><option>Price: low to high</option><option>Highest quantity</option></select>
            <button className={showFilters ? "filter-button active" : "filter-button"} onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={16}/> Filters</button>
          </div>
          {showFilters && <div className="sl-filter-panel"><b>Distance</b>{["1","5","10","25","50","100"].map(x => <button key={x} onClick={() => setNotice("Distance filter: "+x+" km")}>{x} km</button>)}<b>Condition</b>{["Unused","Surplus","Leftover","Like New","Used","Recovered"].map(x => <button key={x}>{x}</button>)}<b>Seller</b><button>Verified Seller</button><button>Business</button><button>Individual</button></div>}
          <div className="sl-results-meta"><b>{filteredListings.length} materials</b><span><MapPin size={13}/> Within 25 km of Ahmedabad</span><span>Grid · List · Map</span></div>
          {filteredListings.length ? <div className="listing-grid">{filteredListings.map(l => <ListingCard key={l.id} listing={l} isSaved={saved.includes(l.id)} isRequested={requested.includes(l.id)} onToggleSaved={toggleSaved} onRequest={requestItem}/>)}</div> : <div className="empty-state"><Search size={24}/><h3>No materials found</h3><p>Try another search or post a requirement.</p><button className="secondary-button" onClick={() => {setSearch("");setCategory("All materials");}}>Clear filters</button></div>}
        </section>

        <section className="page-width sl-section sl-nearby"><div className="sl-split-head"><div><span className="sl-kicker">AVAILABLE NEAR YOU</span><h2>Local surplus. Real value.</h2></div><span>Showing Ahmedabad · 25 km</span></div><div className="sl-mini-grid">{filteredListings.slice(0,4).map(l => <div className="sl-mini-card"><div style={{backgroundImage:"url("+l.image+")"}}></div><b>{l.title}</b><span>{l.price} · {l.quantity}</span><small><MapPin size={11}/> {l.location} · {l.distance}</small></div>)}</div></section>

        <section className="sl-impact"><div className="page-width sl-impact-inner"><div><span className="sl-kicker">SECOND LIFE</span><h2>Good materials deserve a second chance.</h2><p>Reclaim makes reuse practical: better prices for buyers, money back for sellers, and less useful material sitting idle.</p></div><div className="sl-stat-grid"><div><b>12,840+</b><span>materials reused</span></div><div><b>₹18L+</b><span>estimated buyer savings</span></div><div><b>2,400+</b><span>second-life connections</span></div></div></div></section>

        <section className="page-width sl-section" id="how-it-works"><div className="sl-section-head"><div><span className="sl-kicker">HOW IT WORKS</span><h2>UNUSED → RECLAIM → USEFUL AGAIN</h2><p>One simple exchange gives useful things another life.</p></div></div><div className="sl-how-grid">{[["01","List","Someone has something they don’t need."],["02","Discover","Someone nearby needs it."],["03","Connect","Chat and agree on price."],["04","Exchange","Pickup or delivery."],["05","Reuse","The item gets a second life."]].map(x => <div><b>{x[0]}</b><h3>{x[1]}</h3><p>{x[2]}</p></div>)}</div></section>

        <section className="page-width sl-section sl-trust"><div><span className="sl-kicker">TRUST & SAFETY</span><h2>Built for real-world exchanges.</h2></div><div className="sl-trust-grid"><span><ShieldCheck/> Phone Verified</span><span><ShieldCheck/> Identity Verified</span><span><ShieldCheck/> Business Verified</span><span><ShieldCheck/> Transaction Completed</span><span><ShieldCheck/> Report listing / seller</span><span><ShieldCheck/> Inspection option</span></div></section>

        <section className="page-width sl-section sl-final"><h2>Don’t throw value away.</h2><p>Someone might need what you don’t.</p><div><button className="primary-button" onClick={() => document.getElementById("marketplace")?.scrollIntoView({behavior:"smooth"})}>Start Buying</button><button className="secondary-button" onClick={() => setShowPostModal(true)}>Sell Something</button></div></section>
      </main>

      <footer className="site-footer sl-footer-new"><div className="page-width sl-footer-grid"><div><div className="sl-footer-logo">Reclaim</div><p>Buy what you need. Sell what you don’t.</p><p>Don’t let useful things sit unused.</p></div><div><b>MARKETPLACE</b><button>Browse Materials</button><button>Categories</button><button onClick={() => setShowRequirementModal(true)}>Post a Requirement</button></div><div><b>COMMUNITY</b><button>How It Works</button><button onClick={() => session ? setShowAdmin(isAdmin) : setShowAuthModal(true)}>My Account</button><button onClick={() => setNotice("Support: support@reclaim.in")}>Help & Safety</button></div><div><b>FOR EVERYONE</b><p>Individuals · Homeowners · Tenants · Contractors · Builders · Architects · Designers · Shops · Dealers · Factories · Offices · Warehouses · Event companies · Project sites</p></div></div></footer>

      {showAdmin && isAdmin && <AdminPanel onClose={() => setShowAdmin(false)} onWebsite={() => {setShowAdmin(false);setShowWebsiteEditor(true)}} onNotice={m => {setShowAdmin(false);setNotice(m);}}/>}
      {showWebsiteEditor && isAdmin && <WebsiteEditor initial={siteSettings} onClose={() => setShowWebsiteEditor(false)} onSaved={next => {setSiteSettings(next);setShowWebsiteEditor(false);setNotice("Reclaim website updated.")}}/>}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onSignedIn={(name,admin) => {setProfileName(name);setIsAdmin(admin);setShowAuthModal(false)}}/>}
      {showPostModal && <PostMaterialModal onClose={() => setShowPostModal(false)} onSubmit={async (form,file) => {
        if (!session) {setShowAuthModal(true);return;}
        let imageUrl = "";
        if(file){const path=session.user.id+"/"+crypto.randomUUID()+"-"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_");const up=await supabase.storage.from("listing-images").upload(path,file);if(up.error){setNotice("Image upload failed.");return;}imageUrl=supabase.storage.from("listing-images").getPublicUrl(path).data.publicUrl;}
        const {data,error}=await supabase.from("listings").insert({owner_id:session.user.id,title:form.title||"New item",category:form.category,quantity:form.quantity||"Available",price:form.price||"Make an offer",location:form.location||"Ahmedabad",description:form.description||"",image_url:imageUrl||null}).select("*").single();
        if(error||!data){setNotice(error?.message||"Could not publish.");return;}
        setListings(cur => [{id:data.id,title:data.title,category:data.category as Category,quantity:data.quantity,price:data.price,location:data.location,distance:"Nearby",posted:"Just now",seller:profileName,initials:profileName.slice(0,2).toUpperCase(),verified:false,image:data.image_url||"",accent:"wood",description:data.description||""},...cur]);
        setShowPostModal(false);setNotice("Your material is live on Reclaim.");
      }}/>}
      {showRequirementModal && <RequirementModal onClose={() => setShowRequirementModal(false)} onSubmit={r => {setShowRequirementModal(false);setNotice("Requirement posted. Matching sellers can respond.");}}/>}
      {showAllCategories && <CategoryDirectory onClose={() => setShowAllCategories(false)} onSelect={c => {setCategory(c);setShowAllCategories(false);document.getElementById("marketplace")?.scrollIntoView({behavior:"smooth"})}}/>}
      {notice && <div className="toast"><span className="toast-check"><Check size={15}/></span>{notice}<button onClick={() => setNotice("")}><X size={14}/></button></div>}
    </div>
  );

}

function RequirementModal({onClose,onSubmit}:{onClose:()=>void;onSubmit:(v:any)=>void}) {
 const [f,setF]=useState<any>({category:"Construction & Building",condition:"New / Surplus / Used",location:"Ahmedabad"});
 const u=(k:string,v:any)=>setF((x:any)=>({...x,[k]:v}));
 return <div className="modal-backdrop"><div className="modal-card"><div className="modal-header"><div><div className="eyebrow muted-eyebrow"><span className="eyebrow-line"/> RECLAIM REQUIREMENT</div><h2>Can’t find what you need?</h2><p>Tell Reclaim what you’re looking for and let sellers respond.</p></div><button className="modal-close" onClick={onClose}><X size={19}/></button></div><div className="form-grid"><label className="form-field wide"><span>What do you need?</span><input value={f.title||""} onChange={e=>u("title",e.target.value)} placeholder="e.g. 600 Sq.Ft. Marble"/></label><label className="form-field"><span>Category</span><select value={f.category} onChange={e=>u("category",e.target.value)}>{categories.map(c=><option key={c.label}>{c.label}</option>)}</select></label><label className="form-field"><span>Quantity</span><input value={f.quantity||""} onChange={e=>u("quantity",e.target.value)} placeholder="600 Sq.Ft."/></label><label className="form-field"><span>Budget</span><input value={f.budget||""} onChange={e=>u("budget",e.target.value)} placeholder="₹120–₹160 / Sq.Ft."/></label><label className="form-field"><span>Location</span><input value={f.location} onChange={e=>u("location",e.target.value)}/></label><label className="form-field"><span>Required by</span><input type="date" value={f.requiredBy||""} onChange={e=>u("requiredBy",e.target.value)}/></label><label className="form-field wide"><span>Condition & details</span><textarea value={f.description||""} onChange={e=>u("description",e.target.value)} placeholder="Size, specification, preferred condition, reference…"/></label></div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" onClick={()=>onSubmit(f)}>Post Requirement <ArrowRight size={15}/></button></div></div></div>
}
function CategoryDirectory({onClose,onSelect}:{onClose:()=>void;onSelect:(c:string)=>void}) { return <div className="modal-backdrop"><div className="admin-card"><div className="modal-header"><div><div className="eyebrow muted-eyebrow"><span className="eyebrow-line"/> ALL CATEGORIES</div><h2>Everything useful has a place.</h2></div><button className="modal-close" onClick={onClose}><X size={19}/></button></div><div className="all-category-directory">{categories.map(c=><button key={c.label} onClick={()=>onSelect(c.label)}><b>{c.icon} {c.label}</b><span>Explore materials →</span></button>)}</div></div></div> }

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
