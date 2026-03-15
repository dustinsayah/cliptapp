import React from 'react'
import { Composition } from 'remotion'
import { ReelComposition, calcTotalFrames } from './ReelComposition'
import type { ReelCompositionProps } from './types'

const defaultProps: ReelCompositionProps = {
  firstName: 'ATHLETE',
  lastName: '',
  jerseyNumber: '0',
  sport: 'Basketball',
  school: 'High School',
  position: 'Guard',
  gradYear: '2025',
  email: 'athlete@example.com',
  phone: '',
  heightFt: '6',
  heightIn: '2',
  weight: '185',
  gpa: '3.8',
  coachName: '',
  coachEmail: '',
  statsData: { PPG: '18.5', APG: '6.2', RPG: '4.1' },
  clips: [],
  musicUrl: null,
  music: null,
  accentHex: '#00A3FF',
  width: 1920,
  height: 1080,
  spotlightStyle: 'circle',
  exportType: 'coach',
}

export const RemotionRoot = () => {
  return (
    <Composition
      id="HighlightReel"
      component={ReelComposition}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.max(calcTotalFrames(props as ReelCompositionProps), 30),
        fps: 30,
        width:  (props as ReelCompositionProps).width  || 1920,
        height: (props as ReelCompositionProps).height || 1080,
      })}
      defaultProps={defaultProps}
    />
  )
}
