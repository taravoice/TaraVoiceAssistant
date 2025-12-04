import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variants = {
    primary: "bg-[#0097b2] text-white hover:bg-[#007f96] hover:shadow-lg hover:shadow-[#0097b2]/30 focus:ring-[#0097b2]",
    secondary: "bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg focus:ring-slate-500",
    outline: "border-2 border-[#0097b2] text-[#0097b2] hover:bg-[#0097b2]/10 focus:ring-[#0097b2]",
    ghost: "text-slate-600 hover:text-[#0097b2] hover:bg-[#0097b2]/10"
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg"
  };

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
