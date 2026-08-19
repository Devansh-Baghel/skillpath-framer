## The courses section

Base URL:

[https://syncsphere-hiv6.onrender.com](https://syncsphere-hiv6.onrender.com)

Two endpoints. Both GET. No auth.

1\. /assignment/course-data

Returns an array of 5 to 10 courses. The count changes between calls, so don't build for exactly 8 cards. Each course looks like this:

{  
  "courseName": "How To YouTube",  
  "courseCode": "how-to-youtube",  
  "description": "From concept to creation, learn how to build, grow, and monetize a YouTube channel using practical systems and real-world execution.",  
  "mainCategory": "Content Creation",  
  "shortCourse": "YouTube",  
  "courseType": "Original",  
  "pricePaise": 199900,  
  "priceUsdCents": 3999,  
  "mangoId": "a1b2c3d4e5f6789012345678",  
  "refundable": true  
}

2\. /assignment/country-code

Returns {"country\_code": "IN"} or {"country\_code": "US"}. It flips between the two.

This decides the price you show. IN means show rupees from pricePaise. US means show dollars from priceUsdCents. Notice the units. 199900 paise is not ₹1,99,900. If a card says that, we stop reading.

Each card shows:

* Course name  
* Description, cut off at two lines, cleanly  
* Price, in the right currency with the right formatting  
* One more field from the data. You pick. Pick the one a real learner would want to see.

---

## The rules

Build it as a code component.

Not with Framer's Fetch. Fetch can't loop through arrays, so you can't build a grid with it. Write a React code component and do the fetching inside it.

Handle what happens when things go wrong.

We're telling you upfront: this API fails on purpose. Roughly 1 in 3 requests returns a 404 or 500\. Both endpoints. That's not a bug, that's the test.

Four situations. Loading. Error. Zero results. Working.

If your page goes blank or dumps a raw error on screen, you lose this section. And think about what happens when the country call fails but the course call works. What do you show? There's no single right answer. There are wrong ones.

Only GET works.

Every other method returns a 405\. If your component is sending anything else, ask yourself why.

Give us two property controls.

Someone who can't code should be able to change something from the Framer panel without touching your code. You pick which two. Pick the ones a designer would actually ask for.

Make it work on phones.

3 columns on desktop. 2 on tablet. 1 on mobile. Nothing should break in between. Remember the card count varies, so the grid can't assume a nice round number.

Don't hardcode the data.
