"use client"

import { NavMain } from "@/components/nav-main"

export default function SettingsPage() {
  return (
    <div className="grid grid-cols-2">
      <div className="col-span-1">
        <NavMain
          items={[
            {
              title: "Settings",
              url: "/dashboard/settings",
            },
          ]}
          actions={{
            onClick: () => {},
          }}
        />
      </div>
      <div className="col-span-1">
        <h1>Settings</h1>
      </div>
    </div>
  )
}
