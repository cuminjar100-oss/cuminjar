import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { authInputCls } from "@/components/AuthField";

export default function PasswordInput({
  value,
  onChange,
  placeholder = "••••••••",
  autoComplete = "current-password",
  testId,
  minLength = 6,
  required = true,
  autoFocus = false,
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        onChange={onChange}
        placeholder={placeholder}
        data-testid={testId}
        className={`${authInputCls} pr-12`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        data-testid={testId ? `${testId}-toggle` : undefined}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-xl text-[#8C857B] hover:text-[#2C302B] hover:bg-[#F6F3EB] transition-colors"
        aria-label={show ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {show ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
      </button>
    </div>
  );
}
