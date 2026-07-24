import type {Meta,StoryObj} from '@storybook/react';import {Target} from 'lucide-react';
function ReadingMission(){return <div style={{width:240,padding:20}}><div className="mission"><Target size={17}/><div><b>Your mission</b><p>Test whether this decision still works at 40 teams.</p></div></div></div>}
export default {title:'Margin/Reading Mission',component:ReadingMission} satisfies Meta<typeof ReadingMission>;export const Default:StoryObj<typeof ReadingMission>={};
