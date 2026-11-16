import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import { Colors } from './Colors';

interface IconProps {
  size?: number;
  color?: string;
  secondaryColor?: string;
}

export const ScalesOfJustice: React.FC<IconProps> = ({
  size = 48,
  color = Colors.gold,
  secondaryColor = Colors.ivory
}) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    {/* Base and Central Pillar */}
    <Rect x="20" y="56" width="24" height="4" rx="2" fill={color} />
    <Rect x="26" y="52" width="12" height="4" rx="1" fill={color} />
    <Path d="M30 16V52H34V16H30Z" fill={color} />
    
    {/* Top Finial / Pivot */}
    <Circle cx="32" cy="14" r="5" fill={color} />
    <Circle cx="32" cy="14" r="2" fill={secondaryColor} />
    
    {/* Horizontal Balancing Beam */}
    <Path d="M8 20C8 18.8954 8.89543 18 10 18H54C55.1046 18 56 18.8954 56 20C56 21.1046 55.1046 22 54 22H10C8.89543 22 8 21.1046 8 20Z" fill={color} />
    
    {/* Left Scale Strings & Pan */}
    <Path d="M12 21L6 36M12 21L18 36" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Path d="M4 36C4 36 6 44 12 44C18 44 20 36 20 36H4Z" fill={color} opacity={0.9} />
    
    {/* Right Scale Strings & Pan */}
    <Path d="M52 21L46 36M52 21L58 36" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Path d="M44 36C44 36 46 44 52 44C58 44 60 36 60 36H44Z" fill={color} opacity={0.9} />
  </Svg>
);

export const GavelIcon: React.FC<IconProps> = ({
  size = 48,
  color = Colors.gold,
  secondaryColor = Colors.navy
}) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    {/* Sound Block */}
    <Rect x="8" y="48" width="48" height="8" rx="3" fill={color} />
    <Rect x="14" y="44" width="36" height="4" rx="2" fill={secondaryColor} opacity={0.3} />
    
    {/* Gavel Head (Angled) */}
    <G transform="rotate(-30 32 30)">
      <Rect x="20" y="8" width="24" height="14" rx="3" fill={color} />
      <Rect x="16" y="6" width="6" height="18" rx="2" fill={color} />
      <Rect x="42" y="6" width="6" height="18" rx="2" fill={color} />
      {/* Handle */}
      <Rect x="30" y="22" width="4" height="28" rx="2" fill={color} />
    </G>
  </Svg>
);

export const CourthousePillars: React.FC<IconProps> = ({
  size = 48,
  color = Colors.gold,
  secondaryColor = Colors.navy
}) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    {/* Triangular Pediment / Roof */}
    <Path d="M32 8L6 22H58L32 8Z" fill={color} />
    
    {/* Architrave Beam */}
    <Rect x="6" y="22" width="52" height="4" rx="1" fill={color} />
    
    {/* 4 Classical Pillars */}
    <Rect x="10" y="28" width="6" height="24" rx="1" fill={color} />
    <Rect x="22" y="28" width="6" height="24" rx="1" fill={color} />
    <Rect x="36" y="28" width="6" height="24" rx="1" fill={color} />
    <Rect x="48" y="28" width="6" height="24" rx="1" fill={color} />
    
    {/* Plinth / Steps */}
    <Rect x="6" y="52" width="52" height="4" rx="1" fill={color} />
    <Rect x="2" y="56" width="60" height="4" rx="1" fill={color} />
  </Svg>
);

export const LawBooks: React.FC<IconProps> = ({
  size = 48,
  color = Colors.gold,
  secondaryColor = Colors.navyLight
}) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    {/* Standing Book 1 */}
    <Rect x="10" y="14" width="10" height="42" rx="2" fill={color} />
    <Rect x="12" y="18" width="6" height="10" rx="1" fill={Colors.ivory} opacity={0.6} />
    
    {/* Standing Book 2 */}
    <Rect x="22" y="10" width="12" height="46" rx="2" fill={secondaryColor} />
    <Path d="M25 18H31M25 24H31" stroke={color} strokeWidth="2" strokeLinecap="round" />
    
    {/* Slanted Book 3 */}
    <G transform="rotate(15 42 34)">
      <Rect x="36" y="12" width="10" height="44" rx="2" fill={color} />
      <Rect x="38" y="16" width="6" height="8" rx="1" fill={Colors.ivory} opacity={0.6} />
    </G>
    
    {/* Book Shelf Floor */}
    <Rect x="4" y="56" width="56" height="4" rx="1" fill={Colors.cardBorder} />
  </Svg>
);
