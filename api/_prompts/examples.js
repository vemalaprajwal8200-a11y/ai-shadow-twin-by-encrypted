/**
 * Few-shot examples based on real college course material items from CS101.
 */
export const FEW_SHOT_EXAMPLES = [
  {
    itemText: "Slide 1.1: Arrays store values contiguously, and each element is accessed by pointer arithmetic.",
    twinReasoning: "As a beginner, I got confused because 'pointer arithmetic' was never defined in earlier slides, and index notation works without explicit pointers.",
    verdict: "defect",
    reason: "Uses undefined term 'pointer arithmetic' and misleads learners on array access methods."
  },
  {
    itemText: "Check-in 1: A stack is a data structure where elements are added to the front. Is this statement true or false?",
    twinReasoning: "The question describes front insertion which matches queue behavior, not stack top push/pop semantics.",
    verdict: "defect",
    reason: "Confuses stack LIFO semantics with queue front insertion."
  },
  {
    itemText: "Check-in 2: In a balanced binary search tree, what is the worst-case cost for search?",
    twinReasoning: "The item asks for worst-case search cost but assumes tree balance without defining what balance means in this unit.",
    verdict: "gap",
    reason: "Assumes prior understanding of tree balance invariants for the O(log n) bound."
  },
  {
    itemText: "Lesson 2.2: The height of a tree is the number of edges from the root to the deepest leaf. This means a single-node tree has height 0.",
    twinReasoning: "This explanation is clear and consistent with standard edge-count definitions.",
    verdict: "clean",
    reason: "Accurate and clear definition of tree height."
  },
  {
    itemText: "Lesson 3.2: A min-heap always keeps the largest value at the root. A priority queue can be implemented with a heap.",
    twinReasoning: "A min-heap by definition keeps the smallest element at the root, so stating largest is an inverted factual error.",
    verdict: "defect",
    reason: "Inverts the min-heap invariant by placing the largest element at the root."
  }
]
