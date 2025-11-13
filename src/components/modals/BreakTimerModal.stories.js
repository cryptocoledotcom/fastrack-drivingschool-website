import React from 'react';
import BreakTimerModal from './BreakTimerModal';
import '../../App.css'; // Import global styles to apply variables
import './Modals.css'; // Import modal-specific styles

// This default export tells Storybook about your component
export default {
  title: 'Components/Modals/BreakTimerModal',
  component: BreakTimerModal,
  // Optional: Add decorators to wrap the story for better presentation
  decorators: [
    (Story) => (
      // This div ensures the modal has a backdrop to render against
      <div>
        <div id="root"></div> {/* react-modal needs a root element */}
        <Story />
      </div>
    ),
  ],
};

// This is a "story" that renders the modal in its open state.
// The `args` object contains the props you want to pass to the component.
export const DefaultOpen = {
  args: {
    isOpen: true,
  },
};

// This is a story that shows the modal AFTER the break is over.
export const BreakOver = {
  args: {
    isOpen: true,
    // By passing this special prop, we force the component into the "break over" state
    // without needing to wait for any timers.
    _test_isBreakOver: true,
    onResume: () => alert('Resume button clicked!'),
  },
};