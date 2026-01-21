import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';

/**
 * Converts an SVG string to a PDF blob keeping vector data.
 * Uses svg2pdf.js to translate SVG nodes to PDF commands.
 */
export const generatePDF = async (svgString: string, width: number, height: number): Promise<Blob> => {
  // Create a temporary container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-10000px';
  container.style.left = '-10000px';
  container.style.visibility = 'hidden';
  // Important: z-index ensures it doesn't interfere with UI interactions even if hidden
  container.style.zIndex = '-1000'; 
  
  // Clean the SVG string to remove potential scripts or harmful attributes
  // For this app, we trust the user input but good practice generally.
  container.innerHTML = svgString;
  
  document.body.appendChild(container);

  try {
    const svgElement = container.querySelector('svg');
    if (!svgElement) {
      throw new Error('Could not parse SVG element');
    }

    // Set dimensions to ensure svg2pdf calculates correctly
    svgElement.setAttribute('width', width.toString());
    svgElement.setAttribute('height', height.toString());
    
    // Ensure preserveAspectRatio is set to a reasonable default if missing, 
    // though usually better to respect the file's setting.

    const orientation = width > height ? 'l' : 'p';

    const pdf = new jsPDF({
      orientation,
      unit: 'px',
      format: [width, height],
      hotfixes: ["px_scaling"] // Helps with sizing consistency in newer jsPDF
    });

    // Generate vector PDF
    // We await this process. svg2pdf handles image loading internally.
    await svg2pdf(svgElement, pdf, {
      x: 0,
      y: 0,
      width: width,
      height: height,
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
