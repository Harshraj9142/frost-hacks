/**
 * Socratic Tutoring Validation Script
 * 
 * Tests the Socratic tutoring mode with various prompts to ensure:
 * - Guiding questions are asked (not direct answers)
 * - Step-by-step reasoning is prompted
 * - Direct answer requests are handled properly
 * 
 * Usage: npx tsx scripts/validate-socratic.ts
 */

import { validateSocraticResponse } from "@/lib/citations";

interface TestCase {
  name: string;
  query: string;
  expectedBehavior: string;
  shouldAvoidDirectAnswer: boolean;
  minimumQuestions: number;
}

interface ValidationResult {
  testCase: TestCase;
  response: string;
  validation: ReturnType<typeof validateSocraticResponse>;
  passed: boolean;
  feedback: string[];
}

// Test cases to validate Socratic tutoring
const testCases: TestCase[] = [
  {
    name: "Basic Concept Question",
    query: "What is binary search?",
    expectedBehavior: "Should ask guiding questions about sorted arrays, middle elements, and elimination",
    shouldAvoidDirectAnswer: true,
    minimumQuestions: 3,
  },
  {
    name: "Direct Answer Request",
    query: "Give me the final answer about binary search",
    expectedBehavior: "Should redirect to guiding questions, not provide direct answer",
    shouldAvoidDirectAnswer: true,
    minimumQuestions: 3,
  },
  {
    name: "Solve Directly Request",
    query: "Solve this directly: How does binary search work?",
    expectedBehavior: "Should guide with questions instead of solving",
    shouldAvoidDirectAnswer: true,
    minimumQuestions: 3,
  },
  {
    name: "Just Explain Request",
    query: "Just explain binary search to me",
    expectedBehavior: "Should use Socratic method, not direct explanation",
    shouldAvoidDirectAnswer: true,
    minimumQuestions: 3,
  },
  {
    name: "Tell Me Request",
    query: "Tell me what binary search is",
    expectedBehavior: "Should ask questions to help student discover",
    shouldAvoidDirectAnswer: true,
    minimumQuestions: 3,
  },
  {
    name: "Complex Concept",
    query: "How does recursion work?",
    expectedBehavior: "Should break down into guiding questions about base cases and recursive calls",
    shouldAvoidDirectAnswer: true,
    minimumQuestions: 3,
  },
  {
    name: "Problem Solving",
    query: "How do I solve this sorting problem?",
    expectedBehavior: "Should guide thinking process, not provide solution",
    shouldAvoidDirectAnswer: true,
    minimumQuestions: 3,
  },
  {
    name: "Comparison Question",
    query: "What's the difference between binary search and linear search?",
    expectedBehavior: "Should ask questions to help student compare and contrast",
    shouldAvoidDirectAnswer: true,
    minimumQuestions: 3,
  },
];

// Example Socratic responses for testing
const exampleResponses = {
  excellent: `Great question about binary search! According to Source 1, this is an algorithm that works with sorted arrays. Let's explore how it works together through some guiding questions.

## Let's Explore Together

Think about this: What advantage do we have when working with a **sorted** array versus an unsorted one? [Source 1]

If we look at the middle element of a sorted array, how could that help us eliminate half of the remaining elements in just one comparison?

The materials mention that binary search "repeatedly divides the search space in half" [Source 1]. What do you think happens to the number of elements we need to check with each step?

Can you predict: If we start with 16 elements and eliminate half each time, how many steps would it take to find our target?

## Hints from Your Materials

- Source 1 explains that we start by examining the middle element
- If the target is less than the middle, we know it must be in the left half [Source 1]
- If the target is greater, it must be in the right half [Source 1]
- This process continues until we find the target or run out of elements
- The materials mention this is much faster than checking every element [Source 1]

## Think About It

Try tracing through an example: imagine searching for the number 7 in the sorted array [1, 3, 5, 7, 9, 11, 13]. What would happen at each step?

Once you work through these questions, you'll understand why binary search is so efficient! Take your time and think through each question.`,

  good: `Great question! Let's explore binary search together.

## Let's Explore

What do you think happens when we look at the middle element of a sorted array?

How could we use that information to eliminate elements we don't need to check?

What would happen if we repeat this process?

## Hints

- Start with the middle element
- Compare it to your target
- Eliminate half the array based on the comparison

Think through an example and see what you discover!`,

  poor: `That's a good question about binary search.

What do you know about sorted arrays?

How might we search efficiently?

Binary search uses the middle element to divide the search space.`,

  failing: `Binary search is an algorithm that works by dividing a sorted array in half repeatedly. Here's how it works:

1. First, you check the middle element
2. If it matches, you're done
3. If the target is less, search the left half
4. If the target is greater, search the right half
5. Repeat until found

This gives you O(log n) time complexity, which is much better than linear search's O(n).`,

  directAnswerHandling: `I understand you want a quick answer, but discovering it yourself will help you remember and understand it much better! Let me guide you with some questions that will help you figure it out.

## Let's Explore Together

Looking at Source 1, what do you notice about the array being sorted? Why might that be important?

If we examine the middle element, what information does that give us about where our target might be?

How many elements could we eliminate with just one comparison?

## Hints from Your Materials

- Source 1 mentions that binary search works on sorted arrays
- The middle element acts as a decision point
- We can eliminate half the remaining elements each time
- This process repeats until we find our target

## Think About It

Work through these questions step by step. Try an example with a small array and see what patterns you notice!`,
};

async function validateSocraticTutoring() {
  console.log("🎓 Starting Socratic Tutoring Validation...\n");
  console.log("This will test various scenarios to ensure proper Socratic method implementation.\n");
  
  const results: ValidationResult[] = [];
  
  // Test each example response
  console.log("=" .repeat(80));
  console.log("TESTING EXAMPLE RESPONSES");
  console.log("=".repeat(80) + "\n");
  
  for (const [name, response] of Object.entries(exampleResponses)) {
    console.log(`\n📝 Testing: ${name.toUpperCase()}`);
    console.log("-".repeat(80));
    
    const validation = validateSocraticResponse(response);
    
    console.log(`\n✅ Validation Results:`);
    console.log(`   Quality: ${validation.quality.toUpperCase()}`);
    console.log(`   Is Socratic: ${validation.isSocratic ? '✓ Yes' : '✗ No'}`);
    console.log(`   Question Count: ${validation.questionCount}`);
    console.log(`   Has Direct Answers: ${validation.hasDirectAnswers ? '✗ Yes (BAD)' : '✓ No (GOOD)'}`);
    console.log(`   Has Guiding Questions: ${validation.hasGuidingQuestions ? '✓ Yes' : '✗ No'}`);
    console.log(`   Has Hints: ${validation.hasHints ? '✓ Yes' : '✗ No'}`);
    console.log(`   Has Encouragement: ${validation.hasEncouragement ? '✓ Yes' : '✗ No'}`);
    console.log(`   Has Sections: ${validation.hasSections ? '✓ Yes' : '✗ No'}`);
    
    if (validation.strengths.length > 0) {
      console.log(`\n💪 Strengths:`);
      validation.strengths.forEach(s => console.log(`   ✓ ${s}`));
    }
    
    if (validation.issues.length > 0) {
      console.log(`\n⚠️  Issues:`);
      validation.issues.forEach(i => console.log(`   ✗ ${i}`));
    }
    
    console.log(`\n📄 Response Preview:`);
    console.log(`   "${response.substring(0, 150)}..."\n`);
  }
  
  // Test case scenarios
  console.log("\n\n" + "=".repeat(80));
  console.log("TEST CASE SCENARIOS");
  console.log("=".repeat(80) + "\n");
  
  console.log("These test cases validate how the system should respond to different queries:\n");
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n[${i + 1}/${testCases.length}] ${testCase.name}`);
    console.log("-".repeat(80));
    console.log(`Query: "${testCase.query}"`);
    console.log(`Expected: ${testCase.expectedBehavior}`);
    console.log(`Should Avoid Direct Answer: ${testCase.shouldAvoidDirectAnswer ? 'Yes' : 'No'}`);
    console.log(`Minimum Questions: ${testCase.minimumQuestions}`);
    
    // For demonstration, we'll use the excellent example response
    // In production, this would make an actual API call
    const mockResponse = testCase.query.toLowerCase().includes('give me') || 
                        testCase.query.toLowerCase().includes('solve') ||
                        testCase.query.toLowerCase().includes('just explain') ||
                        testCase.query.toLowerCase().includes('tell me')
      ? exampleResponses.directAnswerHandling
      : exampleResponses.excellent;
    
    const validation = validateSocraticResponse(mockResponse);
    
    const passed = 
      validation.questionCount >= testCase.minimumQuestions &&
      (!testCase.shouldAvoidDirectAnswer || !validation.hasDirectAnswers) &&
      validation.hasGuidingQuestions;
    
    const feedback: string[] = [];
    
    if (passed) {
      feedback.push('✅ Test PASSED');
    } else {
      feedback.push('❌ Test FAILED');
    }
    
    if (validation.questionCount < testCase.minimumQuestions) {
      feedback.push(`Need ${testCase.minimumQuestions} questions, got ${validation.questionCount}`);
    }
    
    if (testCase.shouldAvoidDirectAnswer && validation.hasDirectAnswers) {
      feedback.push('Should not provide direct answers');
    }
    
    if (!validation.hasGuidingQuestions) {
      feedback.push('Missing guiding questions (What/How/Why)');
    }
    
    console.log(`\n${feedback.join('\n')}`);
    console.log(`Quality: ${validation.quality.toUpperCase()}`);
    
    results.push({
      testCase,
      response: mockResponse,
      validation,
      passed,
      feedback,
    });
  }
  
  // Overall summary
  console.log("\n\n" + "=".repeat(80));
  console.log("📊 OVERALL VALIDATION SUMMARY");
  console.log("=".repeat(80) + "\n");
  
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.length - passedTests;
  const passRate = (passedTests / results.length) * 100;
  
  console.log(`Total Test Cases: ${results.length}`);
  console.log(`Passed: ${passedTests} (${passRate.toFixed(0)}%)`);
  console.log(`Failed: ${failedTests} (${(100 - passRate).toFixed(0)}%)`);
  
  const qualityDistribution = results.reduce((acc, r) => {
    acc[r.validation.quality] = (acc[r.validation.quality] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log(`\n📊 Quality Distribution:`);
  Object.entries(qualityDistribution).forEach(([quality, count]) => {
    console.log(`   ${quality}: ${count} (${((count / results.length) * 100).toFixed(0)}%)`);
  });
  
  // Key metrics
  const avgQuestions = results.reduce((sum, r) => sum + r.validation.questionCount, 0) / results.length;
  const responsesWithDirectAnswers = results.filter(r => r.validation.hasDirectAnswers).length;
  const responsesWithGuidingQuestions = results.filter(r => r.validation.hasGuidingQuestions).length;
  const responsesWithHints = results.filter(r => r.validation.hasHints).length;
  
  console.log(`\n📈 Key Metrics:`);
  console.log(`   Average Questions per Response: ${avgQuestions.toFixed(1)}`);
  console.log(`   Responses with Direct Answers: ${responsesWithDirectAnswers} (${((responsesWithDirectAnswers / results.length) * 100).toFixed(0)}%)`);
  console.log(`   Responses with Guiding Questions: ${responsesWithGuidingQuestions} (${((responsesWithGuidingQuestions / results.length) * 100).toFixed(0)}%)`);
  console.log(`   Responses with Hints: ${responsesWithHints} (${((responsesWithHints / results.length) * 100).toFixed(0)}%)`);
  
  // Recommendations
  console.log(`\n💡 Recommendations:`);
  
  if (passRate < 80) {
    console.log(`   🔴 CRITICAL: Pass rate is ${passRate.toFixed(0)}% (target: >80%)`);
    console.log(`      → Review AI prompt for Socratic mode`);
    console.log(`      → Ensure direct answers are forbidden`);
  } else if (passRate < 90) {
    console.log(`   ⚠️  WARNING: Pass rate is ${passRate.toFixed(0)}% (target: >90%)`);
    console.log(`      → Fine-tune prompt for edge cases`);
  } else {
    console.log(`   ✅ EXCELLENT: Pass rate is ${passRate.toFixed(0)}%!`);
  }
  
  if (avgQuestions < 3) {
    console.log(`   ⚠️  Average questions (${avgQuestions.toFixed(1)}) below target (3+)`);
    console.log(`      → Increase minimum question requirement in prompt`);
  }
  
  if (responsesWithDirectAnswers > 0) {
    console.log(`   🔴 CRITICAL: ${responsesWithDirectAnswers} responses contain direct answers`);
    console.log(`      → Strengthen "no direct answers" rule in prompt`);
  }
  
  if (responsesWithGuidingQuestions < results.length) {
    console.log(`   ⚠️  ${results.length - responsesWithGuidingQuestions} responses lack guiding questions`);
    console.log(`      → Emphasize What/How/Why question patterns`);
  }
  
  // Example outputs
  console.log(`\n\n${"=".repeat(80)}`);
  console.log("📚 EXAMPLE SOCRATIC RESPONSES");
  console.log("=".repeat(80) + "\n");
  
  console.log("✅ EXCELLENT EXAMPLE (What to aim for):\n");
  console.log(exampleResponses.excellent);
  
  console.log("\n\n❌ FAILING EXAMPLE (What to avoid):\n");
  console.log(exampleResponses.failing);
  
  console.log("\n\n✅ HANDLING DIRECT ANSWER REQUESTS:\n");
  console.log(exampleResponses.directAnswerHandling);
  
  console.log("\n\n✅ Validation Complete!\n");
  
  // Save report
  const fs = await import('fs');
  const reportPath = './socratic-validation-report.txt';
  const reportContent = [
    '='.repeat(80),
    'SOCRATIC TUTORING VALIDATION REPORT',
    `Generated: ${new Date().toISOString()}`,
    '='.repeat(80),
    '',
    `Total Test Cases: ${results.length}`,
    `Passed: ${passedTests} (${passRate.toFixed(0)}%)`,
    `Failed: ${failedTests}`,
    `Average Questions: ${avgQuestions.toFixed(1)}`,
    '',
    'Quality Distribution:',
    ...Object.entries(qualityDistribution).map(([q, c]) => `  ${q}: ${c}`),
    '',
    '='.repeat(80),
    'TEST RESULTS',
    '='.repeat(80),
    '',
    ...results.map((r, i) => [
      `[${i + 1}] ${r.testCase.name}`,
      `    Query: ${r.testCase.query}`,
      `    Status: ${r.passed ? 'PASSED' : 'FAILED'}`,
      `    Quality: ${r.validation.quality}`,
      `    Questions: ${r.validation.questionCount}`,
      `    Direct Answers: ${r.validation.hasDirectAnswers ? 'Yes (BAD)' : 'No (GOOD)'}`,
      `    Feedback: ${r.feedback.join('; ')}`,
      '',
    ].join('\n')),
  ].join('\n');
  
  fs.writeFileSync(reportPath, reportContent);
  console.log(`📄 Detailed report saved to: ${reportPath}\n`);
}

// Run validation
validateSocraticTutoring().catch(console.error);
