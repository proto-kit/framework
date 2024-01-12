DependencyFactories use type-inference to correctly infer and embedd the generated types into the ModuleContainers module types.
This enables us to use type-checked `container.resolve("dependency1")` and not have to rely on `.resolveOrFail()`.

The way this works is that DependencyFactories implement a methods that returns an record of type
`Record<moduleName:string, provider:tsyringeProvider>`.

In order for the dependencies to get generated, the underlying Module has to be resolved once before.
This is because we register all the dependencies in the afterModuleResolution hook. 

`container.registerDependencyFactories()` takes a `(keyof Modules)[]` as arguments, which specifies the moduleNames of the
dependencyfactories that should be resolved eagerly in order to register all their generated dependencies.

The pattern which all ModuleContainer usages should follow is to:
1. Create a sub-interfaces that declares the minimum dependencies that a factory should create by overriding the dependencies() method in the sub-interface
2. Add this interface as a mandatory module for the ModuleContainer
3. Call `this.registerDependencyFactories(["mandatoryModuleX"])` with the mandatory module's name at the end of `create()`