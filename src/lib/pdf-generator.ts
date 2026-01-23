import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';

export const generatePDF = async (svgString: string, originalWidth: number, originalHeight: number): Promise<Blob> => {
  // A4 Landscape dimensions in points (approximate)
  // jsPDF unit 'pt' is 1/72 inch. A4 is 297mm x 210mm.
  // 297mm = 841.89pt, 210mm = 595.28pt
  const A4_WIDTH = 841.89;
  const A4_HEIGHT = 595.28;

  // Initialize jsPDF in landscape
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  });

  // Create a temporary DOM element to hold the SVG
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgElement = doc.documentElement;

  // We need to ensure the SVG is actually an SVGElement
  if (!(svgElement instanceof SVGElement)) {
    throw new Error('Invalid SVG content');
  }

  // --- 1. Embed Font (Vladimir Script) ---
  // We need the base64 string of the font.
  // Ideally, this should be fetched from a URL or imported if it's small enough.
  // For this example, we'll fetch it from the public folder.
  
  try {
    const fontResponse = await fetch('/fonts/VladimirScript.ttf');
    const fontBlob = await fontResponse.blob();
    
    // Convert blob to base64
    const reader = new FileReader();
    const base64Font = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
        };
        reader.readAsDataURL(fontBlob);
    });

    // Add font to jsPDF
    pdf.addFileToVFS('VladimirScript.ttf', base64Font);
    pdf.addFont('VladimirScript.ttf', 'Vladimir Script', 'normal');
    // Also register it as the font-family name used in the SVG if different
    pdf.addFont('VladimirScript.ttf', 'VladimirScript', 'normal');
  } catch (e) {
      console.warn('Could not load custom font, falling back to default.', e);
  }

  // --- 2. Convert SVG to PDF ---
  
  // Calculate scaling to fit A4 while maintaining aspect ratio
  // If we want it to fill the page, we can stretch it, or fit "contain" style.
  // Here we will do "contain" (fit within A4) centered.
  
  const scaleX = A4_WIDTH / originalWidth;
  const scaleY = A4_HEIGHT / originalHeight;
  const scale = Math.min(scaleX, scaleY);
  
  const finalWidth = originalWidth * scale;
  const finalHeight = originalHeight * scale;
  
  const x = (A4_WIDTH - finalWidth) / 2;
  const y = (A4_HEIGHT - finalHeight) / 2;

  await svg2pdf(svgElement, pdf, {
    x,
    y,
    width: finalWidth,
    height: finalHeight,
  });

  return pdf.output('blob');
};
