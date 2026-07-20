import React from "react";

export const authInputCls =
  "w-full bg-white border-2 border-[#8C857B]/20 rounded-2xl px-5 py-3 text-[#2C302B] focus:border-[#D96C4A] focus:ring-4 focus:ring-[#D96C4A]/20 outline-none transition-all placeholder:text-[#8C857B]";

export default function AuthField({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wide text-[#8C857B] font-semibold mb-2">
        {label}
      </span>
      {children}
      {hint && <p className="mt-2 text-xs text-[#8C857B]">{hint}</p>}
    </label>
  );
}
