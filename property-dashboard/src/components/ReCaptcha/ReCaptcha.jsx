import { useEffect } from 'react';

const ReCaptcha = ({ onLoad }) => {
  useEffect(() => {
    // The reCAPTCHA container will be initialized by Firebase SMS service
    if (onLoad) {
      onLoad();
    }
  }, [onLoad]);

  return (
    <div 
      id="recaptcha-container" 
      style={{ 
        visibility: 'hidden',
        position: 'absolute',
        top: '-9999px',
        left: '-9999px'
      }}
    />
  );
};

export default ReCaptcha;