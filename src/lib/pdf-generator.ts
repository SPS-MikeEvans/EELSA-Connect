import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';

/**
 * Converts an SVG string to a PDF blob keeping vector data.
 * Uses svg2pdf.js to translate SVG nodes to PDF commands.
 * Enforces A4 Landscape orientation.
 */
export const generatePDF = async (svgString: string, originalWidth: number, originalHeight: number): Promise<Blob> => {
  // Create a temporary container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-10000px';
  container.style.left = '-10000px';
  container.style.visibility = 'hidden';
  container.style.zIndex = '-1000'; 
  
  container.innerHTML = svgString;
  document.body.appendChild(container);

  try {
    const svgElement = container.querySelector('svg');
    if (!svgElement) {
      throw new Error('Could not parse SVG element');
    }

    // A4 Landscape dimensions in points (pt)
    // 297mm x 210mm
    const A4_WIDTH = 841.89;
    const A4_HEIGHT = 595.28;

    // Set SVG attributes to match A4 ratio/size or allow svg2pdf to scale it
    // We want the SVG to scale to fit the A4 page
    svgElement.setAttribute('width', A4_WIDTH.toString());
    svgElement.setAttribute('height', A4_HEIGHT.toString());
    
    // Create PDF with A4 Landscape configuration
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4',
      hotfixes: ["px_scaling"]
    });

    // Generate vector PDF
    // We scale the SVG to fill the A4 page
    await svg2pdf(svgElement, pdf, {
      x: 0,
      y: 0,
      width: A4_WIDTH,
      height: A4_HEIGHT,
    });

    return pdf.output('blob');
  } catch (error) {
    console.error('PDF Generation failed:', error);
    throw error;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};
