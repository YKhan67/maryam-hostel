// src/pages/LandingPage.js
import React from "react";
import { useNavigate } from "react-router-dom";

// Assets
import logoImg from "../assets/maryam_logo.png";
import heroImg from "../assets/hostel_hero.jpg";
import roomImg from "../assets/hostel_room.jpg";
import lifeImg from "../assets/hostel_life.jpg";
import breakfastImg from "../assets/breakfast_menu.jpg";
import lunchImg from "../assets/lunch_menu.jpg";
import dinnerImg from "../assets/dinner_menu.jpg";

// Modern SVG Icons
const Icons = {
  Shield: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Coffee: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
  MapPin: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Wifi: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
};

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Navigation */}
      <nav style={{
        position: 'fixed', top: 0, width: '100%', zIndex: 100,
        background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)', padding: '12px 64px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={logoImg} alt="Logo" style={{ height: '40px' }} />
          <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em', color: 'var(--secondary)' }}>
            MARYAM HOSTEL
          </span>
        </div>
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <a href="#about" style={{ textDecoration: 'none', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem' }}>About</a>
          <a href="#amenities" style={{ textDecoration: 'none', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem' }}>Amenities</a>
          <a href="#contact" style={{ textDecoration: 'none', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem' }}>Contact</a>
          <button
            onClick={() => navigate('/login')}
            className="btn btn-primary"
            style={{ borderRadius: '12px', padding: '8px 24px' }}
          >
            Portal Login
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header style={{
        padding: '160px 64px 100px',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center',
        background: 'radial-gradient(circle at 10% 20%, rgba(195, 146, 43, 0.05) 0%, transparent 40%)'
      }}>
        <div>
          <div style={{
            display: 'inline-block', padding: '6px 16px', background: 'var(--primary-light)',
            color: 'var(--primary-dark)', borderRadius: '999px', fontSize: '0.8rem',
            fontWeight: 800, marginBottom: '24px', letterSpacing: '0.05em'
          }}>
            NOW ACCEPTING ADMISSIONS FOR 2024
          </div>
          <h1 style={{ fontSize: '4rem', lineHeight: 1.1, fontWeight: 800, color: 'var(--secondary)', marginBottom: '24px', letterSpacing: '-0.03em' }}>
            Where comfort <br />
            <span style={{ color: 'var(--primary)' }}>meets excellence.</span>
          </h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '40px', maxWidth: '540px' }}>
            Premium all-girls residential space near NUST Gate 4. Designed for students who seek a peaceful, safe, and inspiring environment.
          </p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <a href="https://wa.me/923312754995" className="btn btn-primary" style={{ padding: '16px 32px', fontSize: '1rem', borderRadius: '16px' }}>
              Book a Visit
            </a>
            <button className="btn" style={{ background: '#fff', border: '1px solid var(--border)', padding: '16px 32px', fontSize: '1rem', borderRadius: '16px' }}>
              View Gallery
            </button>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <img
            src={heroImg}
            alt="Hostel Exterior"
            style={{ width: '100%', borderRadius: '40px', boxShadow: 'var(--shadow-xl)', objectFit: 'cover', height: '600px' }}
          />
          <div style={{
            position: 'absolute', bottom: '-20px', left: '-20px', background: '#fff',
            padding: '24px', borderRadius: '24px', boxShadow: 'var(--shadow-lg)', display: 'flex', gap: '16px'
          }}>
            <div style={{ padding: '12px', background: 'var(--primary-light)', borderRadius: '12px', color: 'var(--primary)' }}>
              <Icons.Shield />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--secondary)' }}>Verified Security</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>24/7 Surveillance & Guard</div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats/Quick Info */}
      <section style={{ padding: '0 64px 100px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        {[
          { icon: <Icons.MapPin />, title: "Prime Location", desc: "H-13, near NUST Gate 4" },
          { icon: <Icons.Coffee />, title: "Quality Dining", desc: "Fresh home-cooked meals" },
          { icon: <Icons.Wifi />, title: "Hi-Speed Internet", desc: "Dedicated student fiber" },
          { icon: <Icons.Shield />, title: "Safe Haven", desc: "Strictly all-female staff" }
        ].map((item, i) => (
          <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px' }}>
            <div style={{ color: 'var(--primary)' }}>{item.icon}</div>
            <div style={{ fontWeight: 800, color: 'var(--secondary)' }}>{item.title}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.desc}</div>
          </div>
        ))}
      </section>

      {/* Featured Section */}
      <section id="about" style={{ padding: '100px 64px', background: '#fff' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '16px' }}>Curated for Students</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>We provide more than just a room. We provide a community where you can thrive academically and personally.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center' }}>
          <img src={roomImg} alt="Room" style={{ width: '100%', borderRadius: '32px', height: '400px', objectFit: 'cover' }} />
          <div>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '20px' }}>Premium Living Spaces</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.8, marginBottom: '32px' }}>
              Our rooms are fully furnished and designed with a "Study-First" philosophy. Each space is well-lit, ventilated, and maintained with the highest standards of hygiene.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {['Daily Cleaning', 'Attached Baths', 'Individual Desks', 'AC/Non-AC Options'].map((opt, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 600 }}>
                  <div style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%' }} />
                  {opt}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Meals Strip */}
      <section id="amenities" style={{ padding: '100px 64px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px' }}>
          <div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '12px' }}>Nutritional Excellence</h2>
            <p style={{ color: 'var(--text-muted)' }}>Balanced, hygienic, and home-style meals for every student.</p>
          </div>
          <button className="btn btn-primary">View Full Menu</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          {[
            { img: breakfastImg, title: "Breakfast", time: "7:30 AM - 9:00 AM" },
            { img: lunchImg, title: "Lunch", time: "1:30 PM - 3:00 PM" },
            { img: dinnerImg, title: "Dinner", time: "8:00 PM - 9:30 PM" }
          ].map((meal, i) => (
            <div key={i} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <img src={meal.img} alt={meal.title} style={{ width: '100%', height: '240px', objectFit: 'cover' }} />
              <div style={{ padding: '24px' }}>
                <div style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '4px' }}>{meal.title}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{meal.time}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section id="contact" style={{ padding: '100px 64px' }}>
        <div style={{
          background: 'var(--secondary)', borderRadius: '40px', padding: '80px',
          textAlign: 'center', position: 'relative', overflow: 'hidden', color: '#fff'
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '24px' }}>Ready to move in?</h2>
            <p style={{ fontSize: '1.1rem', opacity: 0.8, maxWidth: '600px', margin: '0 auto 48px' }}>
              Join the Maryam Hostel community today. Limited slots available for the upcoming semester.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
               <a href="https://wa.me/923312754995" className="btn btn-primary" style={{ padding: '16px 40px', fontSize: '1rem' }}>Get in Touch</a>
               <a href="tel:+923312754995" className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '16px 40px', fontSize: '1rem' }}>Call Management</a>
            </div>
          </div>
          {/* Subtle background graphic */}
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '300px', height: '300px', background: 'var(--primary)', opacity: 0.1, borderRadius: '50%' }} />
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '64px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <img src={logoImg} alt="Logo" style={{ height: '48px', marginBottom: '24px', opacity: 0.8 }} />
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', justifyContent: 'center', gap: '32px' }}>
          <span>© 2024 Maryam Hostel Management</span>
          <a href="#about" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="#about" style={{ color: 'inherit', textDecoration: 'none' }}>Terms of Service</a>
        </div>
      </footer>
    </div>
  );
}
