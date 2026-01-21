import React, { useMemo, useEffect } from 'react';

interface CertificatePreviewProps {
  svgContent: string;
  recipientName: string;
  onDimensionsReady: (width: number, height: number) => void;
}

export const CertificatePreview: React.FC<CertificatePreviewProps> = ({ 
  svgContent, 
  recipientName,
  onDimensionsReady
}) => {
  
  // Extract dimensions ONLY when the raw SVG content changes (i.e., new file upload)
  useEffect(() => {
    if (!svgContent) return;
    
    // Parse dimensions without rendering to main DOM
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    
    if (svg) {
        const viewBox = svg.getAttribute('viewBox');
        let w = 0, h = 0;
        
        if (viewBox) {
            const parts = viewBox.split(/[\s,]+/).map(Number);
            if (parts.length >= 4) {
                w = parts[2];
                h = parts[3];
            }
        } 
        
        if (!w || !h) {
            w = parseFloat(svg.getAttribute('width') || '0');
            h = parseFloat(svg.getAttribute('height') || '0');
        }

        // Defaults if parsing failed
        if (!w) w = 800;
        if (!h) h = 600;
        
        onDimensionsReady(w, h);
    }
  }, [svgContent, onDimensionsReady]);

  // Replace the placeholder dynamically
  const modifiedSvg = useMemo(() => {
    if (!svgContent) return '';
    // Simple replacement - implies user has {{Name}} in their SVG text node
    return svgContent.replace(/{{Name}}/g, recipientName || 'Recipient Name');
  }, [svgContent, recipientName]);

  if (!modifiedSvg) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] bg-gray-100 rounded-xl border border-gray-200">
        <p className="text-gray-400">No template loaded</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-4">
      <div 
        className="w-full flex justify-center items-center [&>svg]:w-full [&>svg]:h-auto [&>svg]:max-w-full"
        dangerouslySetInnerHTML={{ __html: modifiedSvg }} 
      />
    </div>
  );
};
