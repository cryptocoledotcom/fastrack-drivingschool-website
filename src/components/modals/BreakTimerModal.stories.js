import React from 'react';
import BreakTimerModal from './BreakTimerModal';
import { screen, userEvent, waitFor } from '@storybook/testing-library';
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
    // We can mock the onResume function to see it in the Storybook actions panel
    onResume: () => console.log('Resume button clicked!'),
  },
  play: async () => {
    // This 'play' function simulates time passing to show the final state.
    // It requires the @storybook/testing-library addon.
    // We need to tell Storybook to mock the date and time.
    await new Promise(resolve => setTimeout(resolve, 100)); // Allow component to render
    const now = new Date();
    Date.now = () => now.getTime() + 10 * 60 * 1000; // Fast-forward 10 minutes
  },
};