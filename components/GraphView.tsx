
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Note } from '../types';

interface GraphViewProps {
  notes: Note[];
  onNoteClick: (id: string) => void;
}

const GraphView: React.FC<GraphViewProps> = ({ notes, onNoteClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    // Zoom handling
    svg.call(d3.zoom<SVGSVGElement, unknown>().on("zoom", (event) => {
      g.attr("transform", event.transform);
    }));

    const nodes = notes.map(n => ({ id: n.id, title: n.title }));
    
    // Simple link logic: connect notes sharing at least one tag
    const links: any[] = [];
    notes.forEach((n1, i) => {
      notes.slice(i + 1).forEach(n2 => {
        const sharedTags = n1.tags.filter(t => n2.tags.includes(t));
        if (sharedTags.length > 0 || n1.folderId === n2.folderId) {
          links.push({ source: n1.id, target: n2.id });
        }
      });
    });

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = g.append("g")
      .attr("stroke", "#94a3b8")
      .attr("stroke-opacity", 0.4)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1);

    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .on("click", (event, d: any) => onNoteClick(d.id))
      .call(d3.drag<any, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any);

    node.append("circle")
      .attr("r", 8)
      .attr("fill", "#6366f1");

    node.append("text")
      .text((d: any) => d.title)
      .attr("x", 12)
      .attr("y", 4)
      .attr("font-size", "12px")
      .attr("class", "fill-gray-600 dark:fill-gray-400 select-none font-medium");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => simulation.stop();
  }, [notes]);

  return (
    <div className="w-full h-full relative bg-gray-50 dark:bg-[#0d1117]">
      <div className="absolute top-4 left-4 z-10 bg-white/80 dark:bg-gray-800/80 p-3 rounded-lg border border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Graph View</h3>
        <p className="text-[10px] text-gray-400 mt-1">Scroll to zoom, drag nodes to explore connections.</p>
      </div>
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};

export default GraphView;
