import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Variantes shadcn adaptees au systeme "Industry" de la maquette :
// objets filaires, angles droits, une seule couleur d'accent.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none font-heading text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-45 cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-accent text-bg border border-accent hover:bg-accent-600 active:bg-accent-700",
        secondary: "border border-divider hover:bg-text/7 active:bg-text/14",
        ghost: "border border-transparent text-accent-700 hover:bg-accent/10",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-9 px-4",
        lg: "h-11 px-6 text-[15px]",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /**
   * Marques de reperage aux quatre coins.
   *
   * Le systeme les exige sur l'action principale d'un ecran — le seul objet
   * plein de la planche — et les omet sur les boutons secondaires d'une carte
   * qui porte deja son propre cadre.
   */
  marks?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, marks = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const corners = marks ? (
      <>
        <i className="corner tl" />
        <i className="corner tr" />
        <i className="corner bl" />
        <i className="corner br" />
      </>
    ) : null;

    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), marks && "blueprint", className)}
        ref={ref}
        {...props}
      >
        {asChild && React.isValidElement(children)
          ? // `Slot` ne rend qu'un seul enfant : les marques sont injectees
            // dans l'element cible (le <Link>), pas a cote de lui.
            React.cloneElement(
              children as React.ReactElement<{ children?: React.ReactNode }>,
              undefined,
              corners,
              (children as React.ReactElement<{ children?: React.ReactNode }>).props.children,
            )
          : (
              <>
                {corners}
                {children}
              </>
            )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
