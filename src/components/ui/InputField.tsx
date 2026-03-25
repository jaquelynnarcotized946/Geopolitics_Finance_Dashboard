import type { InputHTMLAttributes } from "react";
import clsx from "clsx";

export default function InputField(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-emerald/30 focus:outline-none focus:ring-1 focus:ring-emerald/10",
        props.className,
      )}
    />
  );
}
