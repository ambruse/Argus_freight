import React from 'react';
import { User } from 'lucide-react';

const TEAM_MEMBERS = [
  {
    id: 1,
    name: 'Hassan Salem al Dosari',
    role: 'Chairman',
    bio: 'Hassan leads our regional growth strategies, managing relations with governmental entities and global shipping alliances across GCC hubs.'
  },
  {
    id: 2,
    name: 'Jemshy ',
    role: 'General Manager',
    bio: 'A visionary leader who steers the company through global market complexities with the same precision and foresight that our vessels navigate the open sea. '
  },
  {
    id: 3,
    name: 'Ganesh',
    role: 'COO',
    image: '/images/Ganesh.png',
    bio: 'Ganesh for his exceptional leadership in the fast-moving world of freight forwarding. Managing global shipments and tight deadlines is no easy feat, but his calm approach under pressure, deep supply chain insight, and dedication to our team keep everything moving smoothly every day.'
  },
  {
    id: 4,
    name: 'Mansoor',
    role: 'CFO',
    bio: 'Managing global logistics operations at an executive level requires extraordinary vision and execution, and Mansoor delivers both every day. As our CFO, his strategic guidance, focus on operational efficiency, and drive to modernize our freight forwarding networks keep our business ahead of the curve. His leadership sets the standard for how a modern logistics company should run.'
  }
];

export default function Team() {
  return (
    <div className="services-page-container">
      {/* Banner */}
      <section className="section-padding" style={{ paddingBottom: '3rem', textAlign: 'center', background: 'radial-gradient(circle at top, rgba(245, 176, 55, 0.07) 0%, transparent 60%)' }}>
        <div className="container">
          <span className="section-subtitle font-gold">Professional Assets</span>
          <h1 className="section-title" style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>Our Expert Team</h1>
          <p style={{ maxWidth: '680px', margin: '0 auto', fontSize: '1.1rem' }}>
            The expertise of our team is our greatest strength. Our clients rely on us because we house the industry's sharpest logistics professionals.
          </p>
        </div>
      </section>

      {/* Team Grid */}
      <section className="section-padding" style={{ paddingTop: '3rem', marginBottom: '6rem' }}>
        <div className="container">
          <div className="team-grid">
            {TEAM_MEMBERS.map((member) => (
              <div key={member.id} className="team-card">
                <div className="team-card-image">
                  {member.image ? (
                    <img src={member.image} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={80} style={{ opacity: 0.8 }} />
                  )}
                </div>
                <div className="team-card-info">
                  <h3 className="team-card-name">{member.name}</h3>
                  <div className="team-card-role">{member.role}</div>
                  <p className="team-card-bio">{member.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
