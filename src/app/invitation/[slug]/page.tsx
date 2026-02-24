'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

interface Invitation {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  host: string;
  slug: string;
  rsvps: { name: string; email: string; status: 'yes' | 'no' | 'maybe' }[];
}

export default function InvitationPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [invitation, setInvitation] = useState<Invitation | null>(() => {
    const storedInvitations = localStorage.getItem('invitations');
    if (storedInvitations) {
      const invitations: Invitation[] = JSON.parse(storedInvitations);
      return invitations.find(inv => inv.slug === slug) || null;
    }
    return null;
  });
  const [rsvpForm, setRsvpForm] = useState({ name: '', email: '', status: 'yes' as 'yes' | 'no' | 'maybe' });
  const [submitted, setSubmitted] = useState(false);

  const handleRsvpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    const updatedInvitation = {
      ...invitation,
      rsvps: [...invitation.rsvps, rsvpForm]
    };

    const storedInvitations = localStorage.getItem('invitations');
    if (storedInvitations) {
      const invitations: Invitation[] = JSON.parse(storedInvitations);
      const updated = invitations.map(inv => inv.id === invitation.id ? updatedInvitation : inv);
      localStorage.setItem('invitations', JSON.stringify(updated));
      setInvitation(updatedInvitation);
    }

    setSubmitted(true);
  };

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invitation Not Found</h1>
          <p className="text-gray-600">The invitation you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-8">
          <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{invitation.title}</h1>
            <p className="text-gray-600">Hosted by {invitation.host}</p>
          </div>

          <div className="space-y-4 mb-8">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Description</h3>
              <p className="mt-1 text-sm text-gray-900">{invitation.description}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Date & Time</h3>
              <p className="mt-1 text-sm text-gray-900">{invitation.date} at {invitation.time}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Location</h3>
              <p className="mt-1 text-sm text-gray-900">{invitation.location}</p>
            </div>
          </div>

          {submitted ? (
            <div className="text-center">
              <h2 className="text-xl font-semibold text-green-600 mb-2">RSVP Submitted!</h2>
              <p className="text-gray-600">Thank you for your response.</p>
            </div>
          ) : (
            <form onSubmit={handleRsvpSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={rsvpForm.name}
                  onChange={(e) => setRsvpForm({ ...rsvpForm, name: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={rsvpForm.email}
                  onChange={(e) => setRsvpForm({ ...rsvpForm, email: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Will you attend?
                </label>
                <select
                  id="status"
                  value={rsvpForm.status}
                  onChange={(e) => setRsvpForm({ ...rsvpForm, status: e.target.value as 'yes' | 'no' | 'maybe' })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="yes">Yes, I'll be there</option>
                  <option value="maybe">Maybe</option>
                  <option value="no">No, I can't make it</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Submit RSVP
              </button>
            </form>
          )}

          <div className="mt-8">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Current RSVPs</h3>
            <div className="space-y-2">
              {invitation.rsvps.map((rsvp, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span>{rsvp.name} ({rsvp.email})</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    rsvp.status === 'yes' ? 'bg-green-100 text-green-800' :
                    rsvp.status === 'maybe' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {rsvp.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
