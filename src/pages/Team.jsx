import React from 'react';
import { User } from 'lucide-react';

const TEAM_MEMBERS = [
  {
    id: 1,
    name: 'Ahmed Al-Mansoori',
    role: 'Managing Director & Partner',
    bio: 'Ahmed leads our regional growth strategies, managing relations with governmental entities and global shipping alliances across GCC hubs.'
  },
  {
    id: 2,
    name: 'Sarah Connor',
    role: 'Chief of Customs & Compliance',
    bio: 'An expert in border clearances, Sarah oversees relations with environment and safety ministries to ensure smooth processing of incoming cargo.'
  },
  {
    id: 3,
    name: 'David Miller',
    role: 'FIATA & IATA Cargo Engineer',
    bio: 'David manages air cargo dispatches, coordinating DGR (Dangerous Goods) handling procedures and expedited container scheduling.'
  },
  {
    id: 4,
    name: 'Rajesh Nair',
    role: 'Warehouse Operations Lead',
    bio: 'Rajesh oversees our mega-warehouses, ensuring ERP tracking systems and barcoding processes run efficiently for all client goods.'
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
            Our employees are the most valuable asset in our company. Customers trust us because we employ the brightest minds in the logistics industry.
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
                  <User size={80} style={{ opacity: 0.8 }} />
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
