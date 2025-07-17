import { cn } from "@/lib/utils";
import { Rocket } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function Logo({ size = "md", className }: LogoProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
    xl: "w-16 h-16"
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4", 
    lg: "h-5 w-5",
    xl: "h-8 w-8"
  };

  return (
    <div className={cn(
      "nexTax-gradient rounded-xl flex items-center justify-center",
      sizeClasses[size],
      className
    )}>
      <Rocket className={cn("text-white", iconSizes[size])} />
    </div>
  );
}
