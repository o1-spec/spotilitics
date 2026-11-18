import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
const variants = cva('button', {variants:{variant:{default:'button-green',outline:'button-outline',ghost:'button-ghost'}},defaultVariants:{variant:'default'}});
export function Button({asChild=false,variant,className,...props}: React.ComponentProps<'button'> & VariantProps<typeof variants> & {asChild?:boolean}) {const Component=asChild?Slot:'button';return <Component className={twMerge(clsx(variants({variant}),className))} {...props}/>}
