"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queryLogId: string;
  courseId: string;
  tutorMode: 'direct' | 'guided';
  hadMultipleDocuments: boolean;
  documentCount: number;
  responseLength: number;
  onFeedbackSubmitted?: () => void;
}

const ISSUE_OPTIONS = [
  { value: 'incorrect_info', label: 'Incorrect Information', icon: AlertCircle },
  { value: 'missing_context', label: 'Missing Context', icon: AlertCircle },
  { value: 'poor_citations', label: 'Poor Citations', icon: AlertCircle },
  { value: 'off_topic', label: 'Off Topic', icon: AlertCircle },
  { value: 'too_complex', label: 'Too Complex', icon: AlertCircle },
  { value: 'too_simple', label: 'Too Simple', icon: AlertCircle },
  { value: 'unhelpful_socratic', label: 'Unhelpful Questions', icon: AlertCircle },
  { value: 'needs_direct_answer', label: 'Needs Direct Answer', icon: AlertCircle },
  { value: 'missing_examples', label: 'Missing Examples', icon: AlertCircle },
  { value: 'confusing_explanation', label: 'Confusing', icon: AlertCircle },
];

export function FeedbackDialog({
  open,
  onOpenChange,
  queryLogId,
  courseId,
  tutorMode,
  hadMultipleDocuments,
  documentCount,
  responseLength,
  onFeedbackSubmitted,
}: FeedbackDialogProps) {
  const [rating, setRating] = useState<'helpful' | 'not_helpful' | 'very_helpful' | null>(null);
  const [showDetailed, setShowDetailed] = useState(false);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Category ratings (1-5)
  const [accuracy, setAccuracy] = useState(3);
  const [clarity, setClarity] = useState(3);
  const [completeness, setCompleteness] = useState(3);
  const [relevance, setRelevance] = useState(3);
  const [citations, setCitations] = useState(3);

  // Debug log
  console.log('FeedbackDialog props:', { queryLogId, courseId, tutorMode });

  const handleRatingSelect = (selectedRating: 'helpful' | 'not_helpful' | 'very_helpful') => {
    setRating(selectedRating);
    if (selectedRating === 'not_helpful') {
      setShowDetailed(true);
    }
  };

  const toggleIssue = (issue: string) => {
    setSelectedIssues(prev =>
      prev.includes(issue)
        ? prev.filter(i => i !== issue)
        : [...prev, issue]
    );
  };

  const handleSubmit = async () => {
    if (!rating) return;

    setSubmitting(true);
    try {
      const requestBody = {
        queryLogId,
        rating,
        feedbackCategories: showDetailed ? {
          accuracy,
          clarity,
          completeness,
          relevance,
          citations,
        } : undefined,
        issues: selectedIssues,
        comment: comment.trim() || undefined,
        tutorMode,
        hadMultipleDocuments,
        documentCount,
        responseLength,
      };

      console.log('Submitting feedback:', requestBody);

      const response = await fetch(`/api/feedback?courseId=${courseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      console.log('Feedback response:', response.status, data);

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          onOpenChange(false);
          onFeedbackSubmitted?.();
          // Reset state
          setTimeout(() => {
            setRating(null);
            setShowDetailed(false);
            setSelectedIssues([]);
            setComment("");
            setSubmitted(false);
            setAccuracy(3);
            setClarity(3);
            setCompleteness(3);
            setRelevance(3);
            setCitations(3);
          }, 300);
        }, 1500);
      } else {
        console.error('Feedback submission failed:', data);
        throw new Error(data.error || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <div className="h-16 w-16 rounded-full bg-emerald-400/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Thank You!</h3>
            <p className="text-sm text-muted-foreground">
              Your feedback helps us improve the learning experience.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rate This Response</DialogTitle>
          <DialogDescription>
            Your feedback helps us improve the AI tutor
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quick Rating */}
          <div>
            <p className="text-sm font-medium mb-3">How helpful was this response?</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleRatingSelect('very_helpful')}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  rating === 'very_helpful'
                    ? 'border-emerald-400 bg-emerald-400/10'
                    : 'border-border hover:border-emerald-400/50'
                }`}
              >
                <Sparkles className={`h-6 w-6 mx-auto mb-2 ${
                  rating === 'very_helpful' ? 'text-emerald-400' : 'text-muted-foreground'
                }`} />
                <p className="text-sm font-medium">Very Helpful</p>
              </button>

              <button
                onClick={() => handleRatingSelect('helpful')}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  rating === 'helpful'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <ThumbsUp className={`h-6 w-6 mx-auto mb-2 ${
                  rating === 'helpful' ? 'text-primary' : 'text-muted-foreground'
                }`} />
                <p className="text-sm font-medium">Helpful</p>
              </button>

              <button
                onClick={() => handleRatingSelect('not_helpful')}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  rating === 'not_helpful'
                    ? 'border-red-400 bg-red-400/10'
                    : 'border-border hover:border-red-400/50'
                }`}
              >
                <ThumbsDown className={`h-6 w-6 mx-auto mb-2 ${
                  rating === 'not_helpful' ? 'text-red-400' : 'text-muted-foreground'
                }`} />
                <p className="text-sm font-medium">Not Helpful</p>
              </button>
            </div>
          </div>

          {/* Detailed Feedback (optional or required for not_helpful) */}
          {rating && (
            <>
              {!showDetailed && rating !== 'not_helpful' && (
                <button
                  onClick={() => setShowDetailed(true)}
                  className="text-sm text-primary hover:underline"
                >
                  + Provide detailed feedback (optional)
                </button>
              )}

              {showDetailed && (
                <>
                  {/* Category Ratings */}
                  <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border/50">
                    <p className="text-sm font-medium">Rate specific aspects (1-5):</p>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs">Accuracy</label>
                          <span className="text-xs font-medium">{accuracy}/5</span>
                        </div>
                        <Slider
                          value={[accuracy]}
                          onValueChange={(values) => setAccuracy(Array.isArray(values) ? values[0] : values)}
                          min={1}
                          max={5}
                          step={1}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs">Clarity</label>
                          <span className="text-xs font-medium">{clarity}/5</span>
                        </div>
                        <Slider
                          value={[clarity]}
                          onValueChange={(values) => setClarity(Array.isArray(values) ? values[0] : values)}
                          min={1}
                          max={5}
                          step={1}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs">Completeness</label>
                          <span className="text-xs font-medium">{completeness}/5</span>
                        </div>
                        <Slider
                          value={[completeness]}
                          onValueChange={(values) => setCompleteness(Array.isArray(values) ? values[0] : values)}
                          min={1}
                          max={5}
                          step={1}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs">Relevance</label>
                          <span className="text-xs font-medium">{relevance}/5</span>
                        </div>
                        <Slider
                          value={[relevance]}
                          onValueChange={(values) => setRelevance(Array.isArray(values) ? values[0] : values)}
                          min={1}
                          max={5}
                          step={1}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs">Citations</label>
                          <span className="text-xs font-medium">{citations}/5</span>
                        </div>
                        <Slider
                          value={[citations]}
                          onValueChange={(values) => setCitations(Array.isArray(values) ? values[0] : values)}
                          min={1}
                          max={5}
                          step={1}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Specific Issues */}
                  {rating === 'not_helpful' && (
                    <div>
                      <p className="text-sm font-medium mb-3">What went wrong? (Select all that apply)</p>
                      <div className="flex flex-wrap gap-2">
                        {ISSUE_OPTIONS.map(option => (
                          <button
                            key={option.value}
                            onClick={() => toggleIssue(option.value)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                              selectedIssues.includes(option.value)
                                ? 'bg-red-400/20 border-red-400/50 text-red-400'
                                : 'bg-muted/30 border-border/50 hover:border-red-400/30'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comment */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Additional comments (optional)
                    </label>
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Tell us more about your experience..."
                      className="min-h-[100px]"
                      maxLength={1000}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {comment.length}/1000 characters
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!rating || submitting}
            className="gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Feedback'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
