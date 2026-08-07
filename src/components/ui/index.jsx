import React from 'react';
import { motion } from 'framer-motion';

export function Card({ children, className = '', noPadding = false, ...props }) {
  return (
    <motion.div 
      className={`glass-card ${noPadding ? 'p-0' : ''} ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function Skeleton({ width = '100%', height = '20px', className = '', style = {} }) {
  return (
    <div 
      className={`skeleton ${className}`} 
      style={{ width, height, ...style }}
    />
  );
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  return (
    <motion.button 
      whileTap={{ scale: 0.95 }}
      className={`btn btn-${variant} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export function Badge({ children, status = 'default', className = '' }) {
  let statusClass = 'badge-active';
  if (status === 'SUSPENDUE' || status === 'suspended' || status === 'danger') statusClass = 'badge-suspended';
  if (status === 'EXPIREE' || status === 'expired' || status === 'warning') statusClass = 'badge-expired';
  if (status === 'default') statusClass = 'badge-active';

  return (
    <span className={`badge ${statusClass} ${className}`}>
      {children}
    </span>
  );
}
