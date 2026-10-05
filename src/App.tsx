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
  logo_url:null,logo_text:'SiteLoop',brand_subtitle:'USEFUL. AGAIN.',
  primary_color:'#224a31',accent_color:'#e56d3d',highlight_color:'#b8d668',background_color:'#f4f5f0',surface_color:'#fbfcf8',
  announcement_enabled:false,announcement_text:'',footer_tagline:'Buy what you need. Sell what you don’t.',footer_location:'Anyone can buy. Anyone can sell. Ahmedabad and beyond.',footer_email:'',instagram_url:'',linkedin_url:'',
  meta_title:'SiteLoop — Buy what you need. Sell what you don’t.',meta_description:'A modern open marketplace for useful surplus, leftover, reusable and pre-owned materials.'
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
          <span className="sl-mark"><span></span><span></span><span></span></span><span className="brand-name">SiteLoop</span>
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
          <div className="sl-section-head"><div><span className="sl-kicker">WHAT CAN I BUY?</span><h2>Find almost anything useful.</h2><p>From a few leftover tiles to industrial machinery — if it’s useful, it belongs on SiteLoop.</p></div><button onClick={() => setShowAllCategories(true)}>View All Categories <ArrowRight size={16}/></button></div>
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

        <section className="sl-impact"><div className="page-width sl-impact-inner"><div><span className="sl-kicker">SECOND LIFE</span><h2>Good materials deserve a second chance.</h2><p>SiteLoop makes reuse practical: better prices for buyers, money back for sellers, and less useful material sitting idle.</p></div><div className="sl-stat-grid"><div><b>12,840+</b><span>materials reused</span></div><div><b>₹18L+</b><span>estimated buyer savings</span></div><div><b>2,400+</b><span>second-life connections</span></div></div></div></section>

        <section className="page-width sl-section" id="how-it-works"><div className="sl-section-head"><div><span className="sl-kicker">HOW IT WORKS</span><h2>UNUSED → SITELOOP → USEFUL AGAIN</h2><p>One simple exchange gives useful things another life.</p></div></div><div className="sl-how-grid">{[["01","List","Someone has something they don’t need."],["02","Discover","Someone nearby needs it."],["03","Connect","Chat and agree on price."],["04","Exchange","Pickup or delivery."],["05","Reuse","The item gets a second life."]].map(x => <div><b>{x[0]}</b><h3>{x[1]}</h3><p>{x[2]}</p></div>)}</div></section>

        <section className="page-width sl-section sl-trust"><div><span className="sl-kicker">TRUST & SAFETY</span><h2>Built for real-world exchanges.</h2></div><div className="sl-trust-grid"><span><ShieldCheck/> Phone Verified</span><span><ShieldCheck/> Identity Verified</span><span><ShieldCheck/> Business Verified</span><span><ShieldCheck/> Transaction Completed</span><span><ShieldCheck/> Report listing / seller</span><span><ShieldCheck/> Inspection option</span></div></section>

        <section className="page-width sl-section sl-final"><h2>Don’t throw value away.</h2><p>Someone might need what you don’t.</p><div><button className="primary-button" onClick={() => document.getElementById("marketplace")?.scrollIntoView({behavior:"smooth"})}>Start Buying</button><button className="secondary-button" onClick={() => setShowPostModal(true)}>Sell Something</button></div></section>
      </main>

      <footer className="site-footer sl-footer-new"><div className="page-width sl-footer-grid"><div><div className="sl-footer-logo">SiteLoop</div><p>Buy what you need. Sell what you don’t.</p><p>Don’t let useful things sit unused.</p></div><div><b>MARKETPLACE</b><button>Browse Materials</button><button>Categories</button><button onClick={() => setShowRequirementModal(true)}>Post a Requirement</button></div><div><b>COMMUNITY</b><button>How It Works</button><button onClick={() => session ? setShowAdmin(isAdmin) : setShowAuthModal(true)}>My Account</button><button onClick={() => setNotice("Support: support@siteloop.in")}>Help & Safety</button></div><div><b>FOR EVERYONE</b><p>Individuals · Homeowners · Tenants · Contractors · Builders · Architects · Designers · Shops · Dealers · Factories · Offices · Warehouses · Event companies · Project sites</p></div></div></footer>

      {showAdmin && isAdmin && <AdminPanel onClose={() => setShowAdmin(false)} onWebsite={() => {setShowAdmin(false);setShowWebsiteEditor(true)}} onNotice={m => {setShowAdmin(false);setNotice(m);}}/>}
      {showWebsiteEditor && isAdmin && <WebsiteEditor initial={siteSettings} onClose={() => setShowWebsiteEditor(false)} onSaved={next => {setSiteSettings(next);setShowWebsiteEditor(false);setNotice("SiteLoop website updated.")}}/>}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onSignedIn={(name,admin) => {setProfileName(name);setIsAdmin(admin);setShowAuthModal(false)}}/>}
      {showPostModal && <PostMaterialModal onClose={() => setShowPostModal(false)} onSubmit={async (form,file) => {
        if (!session) {setShowAuthModal(true);return;}
        let imageUrl = "";
        if(file){const path=session.user.id+"/"+crypto.randomUUID()+"-"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_");const up=await supabase.storage.from("listing-images").upload(path,file);if(up.error){setNotice("Image upload failed.");return;}imageUrl=supabase.storage.from("listing-images").getPublicUrl(path).data.publicUrl;}
        const {data,error}=await supabase.from("listings").insert({owner_id:session.user.id,title:form.title||"New item",category:form.category,quantity:form.quantity||"Available",price:form.price||"Make an offer",location:form.location||"Ahmedabad",description:form.description||"",image_url:imageUrl||null}).select("*").single();
        if(error||!data){setNotice(error?.message||"Could not publish.");return;}
        setListings(cur => [{id:data.id,title:data.title,category:data.category as Category,quantity:data.quantity,price:data.price,location:data.location,distance:"Nearby",posted:"Just now",seller:profileName,initials:profileName.slice(0,2).toUpperCase(),verified:false,image:data.image_url||"",accent:"wood",description:data.description||""},...cur]);
        setShowPostModal(false);setNotice("Your material is live on SiteLoop.");
      }}/>}
      {showRequirementModal && <RequirementModal onClose={() => setShowRequirementModal(false)} onSubmit={r => {setShowRequirementModal(false);setNotice("Requirement posted. Matching sellers can respond.");}}/>}
      {showAllCategories && <CategoryDirectory onClose={() => setShowAllCategories(false)} onSelect={c => {setCategory(c);setShowAllCategories(false);document.getElementById("marketplace")?.scrollIntoView({behavior:"smooth"})}}/>}
      {notice && <div className="toast"><span className="toast-check"><Check size={15}/></span>{notice}<button onClick={() => setNotice("")}><X size={14}/></button></div>}
    </div>
  );
