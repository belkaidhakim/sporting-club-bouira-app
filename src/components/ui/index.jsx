import React from 'react';
import { motion } from 'framer-motion';

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 }
};

export function Card({ children, className = '', noPadding = false, ...props }) {
  return (
    <motion.div 
      className={`glass-card ${noPadding ? 'p-0' : ''} ${className}`}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StatCard({ icon, iconBg, iconColor, label, value, subtitle, glowColor }) {
  return (
    <Card className="flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-muted mb-0">{label}</h3>
        <div 
          className="stat-icon" 
          style={{ 
            backgroundColor: iconBg, 
            color: iconColor,
            boxShadow: glowColor ? `0 0 16px ${glowColor}` : 'none'
          }}
        >
          {icon}
        </div>
      </div>
      <div className="stat-value">{value}</div>
      {subtitle && <div className="text-sm text-muted">{subtitle}</div>}
    </Card>
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
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
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
