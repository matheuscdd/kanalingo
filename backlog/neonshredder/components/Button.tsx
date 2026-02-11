import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "px-8 py-3 rounded-md font-bold text-lg uppercase tracking-wider transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(0,0,0,0.5)]";
  
  const variants = {
    primary: "bg-cyan-500 text-black hover:bg-cyan-400 hover:shadow-[0_0_20px_#0ff]",
    secondary: "bg-purple-600 text-white hover:bg-purple-500 hover:shadow-[0_0_20px_#f0f]",
    danger: "bg-red-600 text-white hover:bg-red-500 hover:shadow-[0_0_20px_#f00]"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};