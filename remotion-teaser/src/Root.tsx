import {Composition} from 'remotion';
import {PersonalFirePlanTeaser, teaserData} from './PersonalFirePlanTeaser';

export const RemotionRoot = () => {
  return (
    <Composition
      id="PersonalFirePlanTeaser"
      component={PersonalFirePlanTeaser}
      durationInFrames={540}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={teaserData}
    />
  );
};
