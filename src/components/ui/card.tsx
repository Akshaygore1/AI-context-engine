import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <section className={cn("card", className)} {...props} />; }
export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div data-slot="card-content" className={cn("card-content", className)} {...props} />; }
