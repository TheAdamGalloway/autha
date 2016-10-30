# so you want to contribute
A lot of people have good intentions but end up doing more harm than good. In order to combat this, please follow these guidelines when writing code for autha.

## stylistic choices
1. Always give your functions a name. Anonymous functions give a poor stack trace in the case of an error.
2. Don't trust the type. Try to validate the type of variable before processing it, in order to avoid Type errors when running the application.
3. Indent. Always indent your code with a single tab. Don't use spaces since this makes it less compatible with different text editors.
4. Logic-less. Handlebars helps ensure that any business logic is separate from any templating. The benefit of this is two-fold, since it means that templates can be pre-compiled and rendered by the client, and it means that logic is easily findable and modular.
5. Modularity. Ensure that you do not write functions that are too specific. If there are sections of a function which can be reused in other functions, seperate it into separate functions.

## copyright
This software is released under the license detailed in LICENSE.MD. All other stylistic marks or names are subject to copyright. If you wish to create an independent fork of this software, you must use a different name.