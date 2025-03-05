import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type TabBarIconProps = {
  name: string;
  color: string;
  size?: number;
};

export default function TabBarIcon({ name, color, size = 26 }: TabBarIconProps) {
  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={color}
    />
  );
}
