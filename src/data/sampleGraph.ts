import type { GradleTaskNode, GradleEdge } from '../types/gradle';

/**
 * Sample nodes representing a typical Gradle build task graph
 */
export const sampleNodes: GradleTaskNode[] = [
  {
    id: 'clean',
    type: 'gradleTask',
    position: { x: 250, y: 0 },
    data: {
      taskName: 'clean',
      taskType: 'Delete',
      group: 'build',
      description: 'Deletes the build directory',
    },
  },
  {
    id: 'compileJava',
    type: 'gradleTask',
    position: { x: 100, y: 120 },
    data: {
      taskName: 'compileJava',
      taskType: 'JavaCompile',
      group: 'build',
      description: 'Compiles main Java source',
    },
  },
  {
    id: 'processResources',
    type: 'gradleTask',
    position: { x: 400, y: 120 },
    data: {
      taskName: 'processResources',
      taskType: 'ProcessResources',
      group: 'build',
      description: 'Processes main resources',
    },
  },
  {
    id: 'classes',
    type: 'gradleTask',
    position: { x: 250, y: 240 },
    data: {
      taskName: 'classes',
      taskType: 'Custom',
      group: 'build',
      description: 'Assembles main classes',
    },
  },
  {
    id: 'compileTestJava',
    type: 'gradleTask',
    position: { x: 50, y: 360 },
    data: {
      taskName: 'compileTestJava',
      taskType: 'JavaCompile',
      group: 'build',
      description: 'Compiles test Java source',
    },
  },
  {
    id: 'processTestResources',
    type: 'gradleTask',
    position: { x: 250, y: 360 },
    data: {
      taskName: 'processTestResources',
      taskType: 'ProcessResources',
      group: 'build',
      description: 'Processes test resources',
    },
  },
  {
    id: 'testClasses',
    type: 'gradleTask',
    position: { x: 150, y: 480 },
    data: {
      taskName: 'testClasses',
      taskType: 'Custom',
      group: 'build',
      description: 'Assembles test classes',
    },
  },
  {
    id: 'test',
    type: 'gradleTask',
    position: { x: 150, y: 600 },
    data: {
      taskName: 'test',
      taskType: 'Test',
      group: 'verification',
      description: 'Runs the unit tests',
    },
  },
  {
    id: 'jar',
    type: 'gradleTask',
    position: { x: 450, y: 360 },
    data: {
      taskName: 'jar',
      taskType: 'Jar',
      group: 'build',
      description: 'Assembles a jar archive',
    },
  },
  {
    id: 'assemble',
    type: 'gradleTask',
    position: { x: 450, y: 480 },
    data: {
      taskName: 'assemble',
      taskType: 'Custom',
      group: 'build',
      description: 'Assembles the outputs of this project',
    },
  },
  {
    id: 'check',
    type: 'gradleTask',
    position: { x: 150, y: 720 },
    data: {
      taskName: 'check',
      taskType: 'Custom',
      group: 'verification',
      description: 'Runs all checks',
    },
  },
  {
    id: 'build',
    type: 'gradleTask',
    position: { x: 300, y: 840 },
    data: {
      taskName: 'build',
      taskType: 'Custom',
      group: 'build',
      description: 'Assembles and tests this project',
    },
  },
  {
    id: 'runScript',
    type: 'gradleTask',
    position: { x: 600, y: 240 },
    data: {
      taskName: 'runScript',
      taskType: 'Exec',
      group: 'application',
      description: 'Runs a shell script',
    },
  },
  {
    id: 'packageDist',
    type: 'gradleTask',
    position: { x: 600, y: 480 },
    data: {
      taskName: 'packageDist',
      taskType: 'Zip',
      group: 'distribution',
      description: 'Creates distribution archive',
    },
  },
  {
    id: 'copyAssets',
    type: 'gradleTask',
    position: { x: 600, y: 360 },
    data: {
      taskName: 'copyAssets',
      taskType: 'Copy',
      group: 'build',
      description: 'Copies static assets',
    },
  },
];

/**
 * Sample edges representing task dependencies (dependsOn relationships)
 */
export const sampleEdges: GradleEdge[] = [
  // clean -> compileJava (compile depends on clean completing first)
  {
    id: 'clean-compileJava',
    source: 'clean',
    target: 'compileJava',
    data: { dependencyType: 'dependsOn' },
  },
  // clean -> processResources
  {
    id: 'clean-processResources',
    source: 'clean',
    target: 'processResources',
    data: { dependencyType: 'dependsOn' },
  },
  // compileJava -> classes
  {
    id: 'compileJava-classes',
    source: 'compileJava',
    target: 'classes',
    data: { dependencyType: 'dependsOn' },
  },
  // processResources -> classes
  {
    id: 'processResources-classes',
    source: 'processResources',
    target: 'classes',
    data: { dependencyType: 'dependsOn' },
  },
  // classes -> compileTestJava
  {
    id: 'classes-compileTestJava',
    source: 'classes',
    target: 'compileTestJava',
    data: { dependencyType: 'dependsOn' },
  },
  // classes -> processTestResources
  {
    id: 'classes-processTestResources',
    source: 'classes',
    target: 'processTestResources',
    data: { dependencyType: 'dependsOn' },
  },
  // compileTestJava -> testClasses
  {
    id: 'compileTestJava-testClasses',
    source: 'compileTestJava',
    target: 'testClasses',
    data: { dependencyType: 'dependsOn' },
  },
  // processTestResources -> testClasses
  {
    id: 'processTestResources-testClasses',
    source: 'processTestResources',
    target: 'testClasses',
    data: { dependencyType: 'dependsOn' },
  },
  // testClasses -> test
  {
    id: 'testClasses-test',
    source: 'testClasses',
    target: 'test',
    data: { dependencyType: 'dependsOn' },
  },
  // classes -> jar
  {
    id: 'classes-jar',
    source: 'classes',
    target: 'jar',
    data: { dependencyType: 'dependsOn' },
  },
  // jar -> assemble
  {
    id: 'jar-assemble',
    source: 'jar',
    target: 'assemble',
    data: { dependencyType: 'dependsOn' },
  },
  // test -> check
  {
    id: 'test-check',
    source: 'test',
    target: 'check',
    data: { dependencyType: 'dependsOn' },
  },
  // assemble -> build
  {
    id: 'assemble-build',
    source: 'assemble',
    target: 'build',
    data: { dependencyType: 'dependsOn' },
  },
  // check -> build
  {
    id: 'check-build',
    source: 'check',
    target: 'build',
    data: { dependencyType: 'dependsOn' },
  },
  // processResources -> runScript
  {
    id: 'processResources-runScript',
    source: 'processResources',
    target: 'runScript',
    data: { dependencyType: 'dependsOn' },
  },
  // jar -> copyAssets
  {
    id: 'jar-copyAssets',
    source: 'jar',
    target: 'copyAssets',
    data: { dependencyType: 'dependsOn' },
  },
  // copyAssets -> packageDist
  {
    id: 'copyAssets-packageDist',
    source: 'copyAssets',
    target: 'packageDist',
    data: { dependencyType: 'dependsOn' },
  },
  // assemble -> packageDist
  {
    id: 'assemble-packageDist',
    source: 'assemble',
    target: 'packageDist',
    data: { dependencyType: 'dependsOn' },
  },
];
