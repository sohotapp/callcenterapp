import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const sizes = {
    sm: { icon: "w-5 h-5", text: "text-sm" },
    md: { icon: "w-7 h-7", text: "text-sm" },
    lg: { icon: "w-10 h-10", text: "text-lg" },
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Linear-inspired logo mark - diagonal slash through circle */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-md bg-primary",
          sizes[size].icon
        )}
      >
        {/* Diagonal line - Linear's signature element */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-4/5 h-4/5"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Stylized "R" for RLTX */}
          <path
            d="M12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20C14.4 20 16.55 18.95 18 17.28"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-primary-foreground"
          />
          <path
            d="M12 12H16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-primary-foreground"
          />
          <path
            d="M12 8V12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-primary-foreground"
          />
          {/* Lightning bolt accent for AI/Speed */}
          <path
            d="M17 5L14 11H18L15 17"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary-foreground/80"
          />
        </svg>
      </div>
      {showText && (
        <span className={cn("font-semibold tracking-tight", sizes[size].text)}>
          <span className="text-primary">RLTX</span>{" "}
          <span className="text-muted-foreground font-normal">Lead Gen</span>
        </span>
      )}
    </div>
  );
}

// Simple icon version for favicon/small contexts
export function LogoIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center w-7 h-7 rounded-md bg-primary",
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-4/5 h-4/5"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20C14.4 20 16.55 18.95 18 17.28"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-primary-foreground"
        />
        <path
          d="M12 12H16"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-primary-foreground"
        />
        <path
          d="M12 8V12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-primary-foreground"
        />
        <path
          d="M17 5L14 11H18L15 17"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary-foreground/80"
        />
      </svg>
    </div>
  );
}
