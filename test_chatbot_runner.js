const { parseUserCriteria } = require('./src/modules/chatbot/chatbot.service');

const TEST_CASES = [
  { input: "điện thoại Samsung", expectedBrand: "Samsung", expectedCat: "smartphone" },
  { input: "Samsung dưới 15 triệu", expectedBrand: "Samsung", expectedMaxPrice: 15000000 },
  { input: "iPhone dưới 20 triệu", expectedBrand: "Apple", expectedMaxPrice: 20000000 },
  { input: "Xiaomi chơi game tốt", expectedBrand: "Xiaomi", expectedUseCase: "gaming" },
  { input: "điện thoại dưới 15 triệu", expectedBrand: null, expectedMaxPrice: 15000000 },
  { input: "Samsung hay iPhone tốt hơn?", expectedIsComparison: true },
  { input: "Samsung dưới 5 triệu", expectedBrand: "Samsung" },
  { input: "Samsung dưới 20 triệu chơi game", expectedBrand: "Samsung", expectedMaxPrice: 20000000, expectedUseCase: "gaming" },
  { input: "Samsung", expectedBrand: "Samsung" },
  { input: "tai nghe Samsung", expectedBrand: "Samsung", expectedCat: "accessory" }
];

console.log('=============== RUNNING 10 MANDATORY CHATBOT TESTS ===============\n');

let passed = 0;
TEST_CASES.forEach((tc, index) => {
  const criteria = parseUserCriteria(tc.input, []);
  let ok = true;
  if (tc.expectedBrand !== undefined && criteria.brand !== tc.expectedBrand) ok = false;
  if (tc.expectedCat !== undefined && criteria.category !== tc.expectedCat) ok = false;
  if (tc.expectedMaxPrice !== undefined && criteria.maxPrice !== tc.expectedMaxPrice) ok = false;
  if (tc.expectedUseCase !== undefined && criteria.useCase !== tc.expectedUseCase) ok = false;
  if (tc.expectedIsComparison !== undefined && criteria.isComparison !== tc.expectedIsComparison) ok = false;

  if (ok) {
    passed++;
    console.log(`✅ Test ${index + 1} PASSED: "${tc.input}"`);
    console.log(`   -> Parsed: brand="${criteria.brand}", cat="${criteria.category}", maxPrice=${criteria.maxPrice}, useCase="${criteria.useCase}", isComparison=${criteria.isComparison}`);
  } else {
    console.log(`❌ Test ${index + 1} FAILED: "${tc.input}"`);
    console.log(`   -> Got:`, criteria, 'Expected:', tc);
  }
});

console.log(`\n==================================================`);
console.log(`Final Result: ${passed}/${TEST_CASES.length} Test Cases Passed!`);
console.log(`==================================================`);
