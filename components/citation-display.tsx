"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileText, BookOpen, AlertCircle, CheckCircle2 } from "lucide-react";

interface Citation {
  id: string;
  index: number;
  fileName: string;
  pageInfo: string;
  excerpt: string;
  relevance: number;
  relevancePercent: string;
  chunkIndex: number;
}

interface CitationMetadata {
  totalCitations: number;
  uniqueDocuments: number;
  averageRelevance: number;
  pagesCited: number[];
  hasCitations: boolean;
}

interface CitationValidation {
  hasCitations: boolean;
  citationCount: number;
  sourcesReferenced: number[];
  allSourcesCited: boolean;
  citationDensity: number;
  quality: 'excellent' | 'good' | 'poor' | 'none';
}

interface CitationDisplayProps {
  citations: Citation[];
  metadata: CitationMetadata;
  validation?: CitationValidation;
  compact?: boolean;
}

export function CitationDisplay({ 
  citations, 
  metadata, 
  validation,
  compact = false 
}: CitationDisplayProps) {
  if (!metadata.hasCitations || citations.length === 0) {
    return (
      <Card className="p-4 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">No Citations Available</p>
            <p className="text-xs text-amber-700 mt-1">
              This response was generated without source citations.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-300';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'poor': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'none': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case 'excellent':
      case 'good':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4" />
            <span>{metadata.totalCitations} sources cited</span>
          </div>
          {validation && (
            <Badge variant="outline" className={getQualityColor(validation.quality)}>
              {validation.quality}
            </Badge>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {citations.map((citation) => (
            <Badge key={citation.id} variant="secondary" className="text-xs">
              [{citation.index}] {citation.fileName}
              {citation.pageInfo && `, ${citation.pageInfo}`}
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold text-sm">Sources & Citations</h3>
            <p className="text-xs text-muted-foreground">
              {metadata.totalCitations} citations from {metadata.uniqueDocuments} document(s)
            </p>
          </div>
        </div>
        
        {validation && (
          <Badge variant="outline" className={getQualityColor(validation.quality)}>
            <span className="flex items-center gap-1">
              {getQualityIcon(validation.quality)}
              {validation.quality}
            </span>
          </Badge>
        )}
      </div>

      {/* Validation Metrics */}
      {validation && (
        <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Citations in Response</p>
            <p className="text-sm font-medium">{validation.citationCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Citation Density</p>
            <p className="text-sm font-medium">{validation.citationDensity.toFixed(2)}/100 words</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Sources Referenced</p>
            <p className="text-sm font-medium">
              [{validation.sourcesReferenced.join(', ')}]
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">All Sources Used</p>
            <p className="text-sm font-medium">
              {validation.allSourcesCited ? '✓ Yes' : '✗ No'}
            </p>
          </div>
        </div>
      )}

      <Separator />

      {/* Citation List */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Detailed Citations
        </h4>
        
        {citations.map((citation) => (
          <div 
            key={citation.id}
            className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Badge variant="outline" className="font-mono">
                  [{citation.index}]
                </Badge>
              </div>
              
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {citation.fileName}
                    </span>
                  </div>
                  
                  <Badge 
                    variant="secondary" 
                    className={
                      citation.relevance >= 0.8 
                        ? 'bg-green-100 text-green-800' 
                        : citation.relevance >= 0.7 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                    }
                  >
                    {citation.relevancePercent}
                  </Badge>
                </div>
                
                {citation.pageInfo && (
                  <p className="text-xs text-muted-foreground">
                    📄 {citation.pageInfo}
                  </p>
                )}
                
                <p className="text-xs text-muted-foreground leading-relaxed">
                  "{citation.excerpt}"
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Stats */}
      {metadata.pagesCited.length > 0 && (
        <>
          <Separator />
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Pages cited:</span> {metadata.pagesCited.join(', ')}
          </div>
        </>
      )}
    </Card>
  );
}

export function InlineCitation({ 
  index, 
  fileName, 
  pageInfo 
}: { 
  index: number; 
  fileName: string; 
  pageInfo?: string;
}) {
  return (
    <sup className="inline-flex items-center">
      <Badge 
        variant="outline" 
        className="text-xs font-mono cursor-help ml-0.5"
        title={`${fileName}${pageInfo ? ', ' + pageInfo : ''}`}
      >
        [{index}]
      </Badge>
    </sup>
  );
}
