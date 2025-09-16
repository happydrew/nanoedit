import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive backdrop-blur-md border",
  {
    variants: {
      variant: {
        default:
          "bg-primary/20 text-primary-foreground border-primary/30 shadow-lg hover:bg-primary/30 hover:border-primary/40",
        destructive:
          "bg-destructive/20 text-white border-destructive/30 shadow-lg hover:bg-destructive/30 hover:border-destructive/40 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "bg-background/20 border-border/30 shadow-lg hover:bg-accent/20 hover:text-accent-foreground hover:border-border/40 dark:bg-input/10 dark:border-input/30 dark:hover:bg-input/20",
        secondary:
          "bg-secondary/20 text-secondary-foreground border-secondary/30 shadow-lg hover:bg-secondary/30 hover:border-secondary/40",
        ghost:
          "bg-transparent border-transparent hover:bg-accent/20 hover:text-accent-foreground hover:border-accent/30 dark:hover:bg-accent/20",
        link: "text-primary underline-offset-4 hover:underline bg-transparent border-transparent",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
