import * as cdk from "aws-cdk-lib";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Runtime } from "aws-cdk-lib/aws-lambda";
import {
  NodejsFunction,
  NodejsFunctionProps,
} from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class AlertHandlerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["aws-sdk"],
      },
      runtime: Runtime.NODEJS_18_X,
      // entry:
    };

    // prepare nodejs function
    const alertFunction = new NodejsFunction(this, "alertLambdaFunction", {
      entry: join(__dirname, `../src/alert/index.js`),
      ...nodeJsFunctionProps,
    });

     //Create a new bus
     const AlertEventBus = new EventBus(this, 'alertEventBus', {
      eventBusName: `AlertEventBus`
    });

    // prepare event rule

    const eventRule = new Rule(this, 'alertEventRule', {
      eventBus:AlertEventBus,
      eventPattern:{
        detailType:[
          'hello'
        ]
      }
    })

    eventRule.addTarget(new targets.LambdaFunction(alertFunction));

    // prepare event bridge
    // const alertEventBridge = new EventBridgeDestination()

    // const api = new LambdaRestApi(this, "alertsApi", {
    //   restApiName: "Alert Service",
    //   handler: alertFunction,
    //   proxy: false,
    // });

    const alertApi = new RestApi(this,"alertApi");

    alertApi.root.resourceForPath("/alerts").addMethod("POST", new LambdaIntegration(alertFunction))

    // POST /alerts
    // PATCH /alerts/{:id}
    // DELETE /alerts/{:id}

    // const alerts = api.root.addResource("alerts");

    // alerts.addMethod("POST"); // POST /alerts

    // handle single alert
    // const singleAlert = alerts.addResource(`{id}`); // alerts/{id}

    // singleAlert.addMethod("PATCH"); // PATCH /alerts/{id}
    // singleAlert.addMethod("DELETE"); // DELETE /alerts/{id}

    
  }
}
