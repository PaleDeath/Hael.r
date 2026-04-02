import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GameContainer, type GameContainerTheme } from './GameContainer';

interface BrainGameShellProps {
  title: string;
  /** Use true once the player leaves menus / intro for this session */
  immersive: boolean;
  /** Fullscreen atmosphere. Default light (editorial). Dark: sequence recall, rapid visual only. */
  theme?: GameContainerTheme;
  children: React.ReactNode;
  topAccessory?: React.ReactNode;
  onErrorReset?: () => void;
}

/** Shared chrome for legacy games: back + optional fullscreen overlay while playing */
export const BrainGameShell: React.FC<BrainGameShellProps> = ({
  title,
  immersive,
  theme = 'light',
  children,
  topAccessory,
  onErrorReset,
}) => {
  const navigate = useNavigate();
  return (
    <GameContainer
      immersive={immersive}
      theme={immersive ? theme : 'light'}
      onBack={() => navigate('/brain-training')}
      title={immersive ? undefined : title}
      topAccessory={topAccessory}
      onErrorReset={onErrorReset}
    >
      {children}
    </GameContainer>
  );
};
