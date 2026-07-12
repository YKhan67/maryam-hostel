// src/pages/LandingPage.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/landing.css";

// Assets
import logoImg from "../assets/maryam_logo.png";
import heroImg from "../assets/hostel_hero.jpg";
import roomImg from "../assets/hostel_room.jpg";
import breakfastImg from "../assets/breakfast_menu.jpg";
import lunchImg from "../assets/lunch_menu.jpg";
import dinnerImg from "../assets/Dinner_menu.jpg";

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="landing-wrapper">
      {/* Navigation */}
      <nav className={`main-nav ${scrolled ? "scrolled" : ""}`}>
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        >
          <img src={logoImg} alt="Logo" style={{ height: '40px' }} />
          <span style={{ fontWeight: 900, letterSpacing: '1px', fontSize: '1.4rem', color: 'var(--brand-dark)' }}>
            MARYAM HOSTEL
          </span>
        </div>
        <div className="nav-links">
          <a href="#facilities" className="nav-link">Facilities</a>
          <a href="#meals" className="nav-link">Dining</a>
          <a href="#portal" className="nav-link">Student Portal</a>
        </div>
        <button onClick={() => navigate("/login")} className="nav-btn">Portal Login</button>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-content animate-fade-in">
          <span className="hero-badge">Exclusively for Girls</span>
          <h1 className="hero-title">
            Where Comfort <br />
            Meets <span>Excellence.</span>
          </h1>
          <p className="hero-subtitle">
            Experience a safe, homely, and premium living environment designed specifically for the modern student.
            Located at H-13, just steps away from NUST Gate 4.
          </p>
          <div style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 10 }}>
            <button
              onClick={() => window.location.href = "https://wa.me/923312754995"}
              className="nav-btn"
              style={{ background: '#16a34a' }}
            >
              WhatsApp Support
            </button>
            <button
              onClick={() => navigate("/login")}
              className="nav-btn"
              style={{ background: 'transparent', border: '2px solid var(--brand-dark)', color: 'var(--brand-dark)' }}
            >
              Explore Portal
            </button>
          </div>
        </div>
        <div className="hero-image-container animate-fade-in">
          <img src={heroImg} alt="Hostel Hero" className="hero-image-main animate-float" />
          <div style={{
            position: 'absolute',
            bottom: '-20px',
            right: '20px',
            background: 'white',
            padding: '24px',
            borderRadius: '20px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            zIndex: 5
          }}>
            <div style={{ color: 'var(--brand-gold)', fontWeight: 800, fontSize: '1.5rem' }}>100% Safe</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--brand-grey)' }}>CCTV & Female Staff</div>
          </div>
        </div>
      </header>

      {/* Facilities Section */}
      <section className="section-padding" id="facilities">
        <h2 className="section-title">Premium Facilities</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <span className="feature-icon">🏠</span>
            <h3>Cozy Rooms</h3>
            <p>Fully furnished, spacious rooms designed to provide maximum comfort for focused studying and relaxation.</p>
            <img src={roomImg} alt="Room" style={{ width: '100%', borderRadius: '12px', marginTop: '20px', height: '180px', objectFit: 'cover' }} />
          </div>
          <div className="feature-card">
            <span className="feature-icon">⚡</span>
            <h3>Uninterrupted Power</h3>
            <p>Heavy-duty UPS and generator backup to ensure you never have a dark moment during your study sessions.</p>
            <img
              src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=800"
              alt="UPS and Batteries"
              style={{ width: '100%', borderRadius: '12px', marginTop: '20px', height: '180px', objectFit: 'cover' }}
            />
          </div>
          <div className="feature-card">
            <span className="feature-icon">🧹</span>
            <h3>Daily Housekeeping</h3>
            <p>Professional cleaning staff ensures your living spaces remain hygienic and organized every single day.</p>
            <img
              src="https://images.pexels.com/photos/4099467/pexels-photo-4099467.jpeg?auto=compress&cs=tinysrgb&w=800"
              alt="Housekeeping Staff"
              style={{ width: '100%', borderRadius: '12px', marginTop: '20px', height: '180px', objectFit: 'cover' }}
            />
          </div>
        </div>
      </section>

      {/* Dining Section */}
      <section className="section-padding" id="meals" style={{ background: '#f8fafc' }}>
        <h2 className="section-title">Homely Dining Experience</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <img src={breakfastImg} alt="Breakfast" style={{ width: '100%', borderRadius: '12px', marginBottom: '20px', height: '200px', objectFit: 'cover' }} />
            <h3>Fresh Breakfast</h3>
            <p>Energizing starts with nutritious, home-style breakfast served fresh every morning.</p>
          </div>
          <div className="feature-card">
            <img src={lunchImg} alt="Lunch" style={{ width: '100%', borderRadius: '12px', marginBottom: '20px', height: '200px', objectFit: 'cover' }} />
            <h3>Delicious Lunch</h3>
            <p>A variety of local and continental dishes to keep you powered throughout the day.</p>
          </div>
          <div className="feature-card">
            <img src={dinnerImg} alt="Dinner" style={{ width: '100%', borderRadius: '12px', marginBottom: '20px', height: '200px', objectFit: 'cover' }} />
            <h3>Comforting Dinner</h3>
            <p>End your day with a warm, shared meal that feels exactly like home.</p>
          </div>
        </div>
      </section>

      {/* Portal Highlight Section */}
      <section className="section-padding" id="portal">
        <div className="portal-section animate-fade-in">
          <div className="portal-content">
            <span className="portal-badge">THE INNOVATION LEADER</span>
            <h2 className="portal-title">The Digital Edge</h2>
            <p style={{ fontSize: '1.2rem', opacity: 0.9, lineHeight: 1.6 }}>
              <strong>MaryamHostel.com</strong> is the only hostel in Pakistan providing a state-of-the-art
              web-based student portal. We lead the industry by bringing transparency and convenience to your fingertips.
            </p>
            <ul className="portal-features">
              <li>Real-time Fee Tracking & History</li>
              <li>Digital Support Tickets for Maintenance</li>
              <li>Instant Communication Hub</li>
              <li>Secure Personal Ledger Access</li>
            </ul>
            <button onClick={() => navigate("/login")} className="nav-btn" style={{ background: 'var(--brand-gold)' }}>Login to Portal</button>
          </div>
          <div className="portal-visual">
            <div style={{
               padding: '40px',
               background: 'rgba(255,255,255,0.05)',
               borderRadius: '30px',
               border: '1px solid rgba(255,255,255,0.1)',
               textAlign: 'center'
            }}>
               <div style={{ fontSize: '4rem', marginBottom: '10px' }}>💻</div>
               <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>STUDENT COMMAND CENTER</div>
               <p style={{ fontSize: '0.9rem', opacity: 0.6 }}>Accessible anywhere, anytime.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="section-padding" style={{ background: 'var(--brand-dark)', color: 'white', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <img src={logoImg} alt="Logo" style={{ height: '80px', marginBottom: '20px' }} />
          <h3 style={{ margin: '0 0 8px 0' }}>Maryam Girls Hostel</h3>
        </div>
        <p style={{ opacity: 0.8, margin: 0 }}>H-13 Islamabad, Near NUST Gate 4</p>
        <div style={{ marginTop: '40px', fontSize: '0.8rem', opacity: 0.4 }}>
          © {new Date().getFullYear()} MaryamHostel.com. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
