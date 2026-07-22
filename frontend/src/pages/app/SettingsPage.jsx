import React from 'react';
import AppShell from '../../components/AppShell';
import { currentUser } from '../../mock';

export default function SettingsPage() {
  return (
    <AppShell active="">
      <div className="px-8 py-6 max-w-3xl">
        <h1 className="font-serif-display text-[32px] font-semibold text-neutral-900">Settings</h1>
        <p className="text-neutral-500 text-[14px] mt-1">Manage your account and family preferences.</p>

        <div className="mt-8 space-y-4">
          <section className="bg-white rounded-2xl border border-neutral-200/70 p-6">
            <h2 className="font-semibold text-neutral-900">Profile</h2>
            <div className="flex items-center gap-4 mt-4">
              <img src={currentUser.avatar} alt={currentUser.name} className="w-14 h-14 rounded-full object-cover" />
              <div>
                <p className="font-semibold text-[15px]">{currentUser.name}</p>
                <p className="text-[13px] text-neutral-500">meera.rao@family.com</p>
              </div>
              <button className="ml-auto text-[13px] font-medium text-cumin-green hover:underline">Edit</button>
            </div>
          </section>

          {[
            { t: 'Family Group', d: 'Rao Family • 4 members' },
            { t: 'Language', d: 'English (primary), Tamil (secondary)' },
            { t: 'Notifications', d: 'Email, In-app' },
            { t: 'Privacy & Security', d: 'End-to-end encryption enabled' },
            { t: 'Subscription', d: 'Family Plus • renews Nov 12' }
          ].map(row => (
            <section key={row.t} className="bg-white rounded-2xl border border-neutral-200/70 p-6 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-neutral-900">{row.t}</h2>
                <p className="text-[13px] text-neutral-500 mt-1">{row.d}</p>
              </div>
              <button className="text-[13px] font-medium text-cumin-green hover:underline">Manage</button>
            </section>
          ))}

          <button className="text-[13.5px] text-terracotta font-medium hover:underline">Log out</button>
        </div>
      </div>
    </AppShell>
  );
}
