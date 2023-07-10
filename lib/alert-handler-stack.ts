import * as cdk from "aws-cdk-lib";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import { Runtime, LayerVersion, Code } from "aws-cdk-lib/aws-lambda";
import {
  NodejsFunction,
  NodejsFunctionProps,
} from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";

export class AlertHandlerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the LayerVersion
    const myLayer = new LayerVersion(this, "MyLayer", {
      code: Code.fromAsset("src/zip/nodejs.zip"),
      compatibleRuntimes: [Runtime.NODEJS_18_X],
      description: "My custom layer",
    });

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["aws-sdk"],
      },
      runtime: Runtime.NODEJS_18_X,
      environment: {
        EVENT_SOURCE: "com.apigateway.test",
        EVENT_DETAILTYPE: "API Gateway Request",
        EVENT_BUSNAME: "AlertEventBus",
      },
    };

    // Prepare nodejs function
    const alertFunction = new NodejsFunction(this, "alertLambdaFunction", {
      entry: join(__dirname, `../src/alert/index.js`),
      ...nodeJsFunctionProps,
    });

    alertFunction.addLayers(myLayer);

    // Prepare nodejs function
    const destinationFunction = new NodejsFunction(
      this,
      "destinationFunction",
      {
        entry: join(__dirname, `../src/eventbridge/index.js`),
        ...nodeJsFunctionProps,
      }
    );

    const alertApi = new RestApi(this, "alertApi");

    alertApi.root
      .resourceForPath("/alerts")
      .addMethod("POST", new LambdaIntegration(alertFunction));

    // Create a new bus
    const alertEventBus = new EventBus(this, "alertEventBus", {
      eventBusName: "AlertEventBus",
    });

    const eventRule = new Rule(this, "alertEventRule", {
      eventBus: alertEventBus,
      enabled: true,
      description: "When Alert are received check rule and send if passed",
      eventPattern: {
        source: ["com.apigateway.test"],
        detailType: ["API Gateway Request"],
      },
      ruleName: "alertEventRule",
    });

    eventRule.addTarget(new targets.LambdaFunction(destinationFunction));

    alertEventBus.grantPutEventsTo(alertFunction);
  }
}
