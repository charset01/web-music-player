<?php

require_once dirname(__FILE__).'/../../../server/lib/Api.php';

/**
 * Test class for Api.
 * Generated by PHPUnit on 2016-09-01 at 23:51:56.
 */
class ApiTest extends PHPUnit_Framework_TestCase
{
    /**
     * @var Api
     */
    protected $object;

    /**
     * Sets up the fixture, for example, opens a network connection.
     * This method is called before the test case class' first test.
     */
    public static function setUpBeforeClass()
    {
        require_once dirname(__FILE__).'/../../TestingTool.php';
        $test = new TestingTool();
        $test->setupDummySqlConnection();
    }

    /**
     * Sets up the fixture, for example, opens a network connection.
     * This method is called before a test is executed.
     */
    protected function setUp()
    {
        $this->object = new Api();
        unset($_SERVER['REQUEST_METHOD']);
        $_GET = [];
    }

    /**
     * Tears down the fixture, for example, closes a network connection.
     * This method is called after a the test case class' last test.
     */
    public static function tearDownAfterClass()
    {
        require_once dirname(__FILE__).'/../../TestingTool.php';
        $test = new TestingTool();
        $test->restoreConfig();
    }

    /**
     * @covers Api::__construct
     */
    public function testConstructGet()
    {
        //set method for use in CLI
        $_SERVER['REQUEST_METHOD'] = 'GET';
        $_GET = ['paramOne' => 'valueOne', 'paramTwo' => 'valueTwo'];
        $this->object = new Api('json', array('GET'));
        $this->assertEquals($this->object->method, 'GET', 'Method should be GET');
        $this->assertArrayHasKey('paramOne', $this->object->query, 'Query string should have a paramOne key');
        $this->assertArrayHasKey('paramTwo', $this->object->query, 'Query string should have a paramTwo key');
        $this->assertEquals('valueOne', $this->object->query['paramOne'], 'Invalid value for a GET parameter');
        $this->assertEquals('valueTwo', $this->object->query['paramTwo'], 'Invalid value for a GET parameter');
    }

    /**
     * @covers Api::__construct
     */
    public function testConstructPost()
    {
        //set method for use in CLI
        $_SERVER['REQUEST_METHOD'] = 'POST';
        $_GET = ['paramOne' => 'valueOne', 'paramTwo' => 'valueTwo'];
        $this->object = new Api('json', array('POST'));
        $this->assertEquals($this->object->method, 'POST', 'Method should be POST');
        $this->assertArrayHasKey('paramOne', $this->object->query, 'Query string should have a paramOne key');
    }

    /**
     * @covers Api::__construct
     * @covers Api::output
     * @runInSeparateProcess
     * @expectedException RuntimeException
     */
    public function testCheckConstructMethodNotAllowed()
    {
        //set method for use in CLI
        $_SERVER['REQUEST_METHOD'] = 'GET';
        $this->object = new Api('json', array('POST'));
    }

    /**
     * @covers Api::checkParameterExists
     */
    public function testCheckParameterExists()
    {
        //set method for use in CLI
        $_SERVER['REQUEST_METHOD'] = 'GET';
        $_GET = ['paramOne' => 'valueOne', 'paramTwo' => 'valueTwo'];
        $this->object = new Api('json', array('GET'));
        $this->assertTrue($this->object->checkParameterExists('paramOne', $value), 'Query string should have a paramOne key');
        $this->assertEquals('valueOne', $value, 'Invalid value for a GET parameter');
        $this->object->query['body'] = new stdClass();
        $this->object->query['body']->paramBody = 'valueBody';
        $this->assertTrue($this->object->checkParameterExists('paramBody', $value), 'Query string should have a paramBody key');
        $this->assertEquals('valueBody', $value, 'Invalid value for a POST parameter');
        $this->assertFalse($this->object->checkParameterExists('paramNotKnown', $value), 'Query string should not have a paramNotKnown key');
    }

    /**
     * @covers Api::generateToken
     */
    public function testGenerateToken()
    {
        $dummy = new stdClass();
        $dummy->attributeOne = 'one';
        $token = $this->object->generateToken($dummy);
        $this->assertInstanceOf('stdClass', $token, 'Token should be an object');
        $this->assertObjectHasAttribute('token', $token, 'Token should have a token attribute');
    }

    /**
     * @ covers Api::checkAuth
     * @depends testGenerateToken
     * @runInSeparateProcess
     */
    public function testCheckAuth()
    {
        //set method for use in CLI
        $_SERVER['REQUEST_METHOD'] = 'GET';
        //create valid token
        include_once $_SERVER['DOCUMENT_ROOT'].'/server/lib/User.php';
        $user = new User(1);
        $token = $this->object->generateToken($user->getProfile());
        $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer '.$token->token;
        $this->object = new Api('json', array('GET'));
        $this->assertEquals(1, $this->object->checkAuth(), 'Token should be valid');
    }

    /**
     * @covers Api::checkAuth
     * @runInSeparateProcess
     */
    public function testcheckAuthWithoutAuthorizationHeader()
    {
        //set method for use in CLI
        $_SERVER['REQUEST_METHOD'] = 'GET';
        $this->object = new Api('json', array('GET'));
        ob_start();
        $this->assertFalse($this->object->checkAuth());
        $output = ob_get_contents();
        ob_end_clean();
        $this->assertEquals('{"code":401,"message":"Authorization header not found"}', $output, 'Output should be a json string but found: '.$output);
    }

    /**
     * @covers Api::checkAuth
     * @runInSeparateProcess
     */
    public function testcheckAuthWithInvalidAuthorizationHeaderScheme()
    {
        //set method for use in CLI
        $_SERVER['REQUEST_METHOD'] = 'GET';
        $_SERVER['HTTP_AUTHORIZATION'] = 'Digest xxx';
        $this->object = new Api('json', array('GET'));
        ob_start();
        $this->assertFalse($this->object->checkAuth());
        $output = ob_get_contents();
        ob_end_clean();
        $this->assertEquals('{"code":401,"message":"Token scheme must be bearer"}', $output, 'Output should be a json string but found: '.$output);
    }

    /**
     * @covers Api::checkAuth
     * @runInSeparateProcess
     */
    public function testcheckAuthWithInvalidAuthorizationHeader()
    {
        //set method for use in CLI
        $_SERVER['REQUEST_METHOD'] = 'GET';
        $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
        $this->object = new Api('json', array('GET'));
        ob_start();
        $this->assertFalse($this->object->checkAuth());
        $output = ob_get_contents();
        ob_end_clean();
        $this->assertEquals('{"code":401,"message":"Token is not valid"}', $output, 'Output should be a json string but found: '.$output);
    }

    /**
     * @covers Api::checkAuth
     * @depends testGenerateToken
     * @runInSeparateProcess
     */
    public function testcheckAuthWithInvalidSubAttribute()
    {
        //set method for use in CLI
        $_SERVER['REQUEST_METHOD'] = 'GET';
        //create valid token
        include_once $_SERVER['DOCUMENT_ROOT'].'/server/lib/User.php';
        $user = new User(1);
        $userProfile=$user->getProfile();
        unset($userProfile->sub);
        $token = $this->object->generateToken($userProfile);
        $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer '.$token->token;
        $this->object = new Api('json', array('GET'));
        ob_start();
        $this->assertFalse($this->object->checkAuth());
        $output = ob_get_contents();
        ob_end_clean();
        $this->assertEquals('{"code":401,"message":"Subject not found"}', $output, 'Output should be a json string but found: '.$output);
    }

    /**
     * @covers Api::checkScope
     */
    public function testCheckScope()
    {
        $this->assertFalse($this->object->checkScope('user'), 'Unknown user should not have "user" in scope');
        $this->object->requesterId = 1;
        $this->assertTrue($this->object->checkScope('user'), 'User should have "user" in scope');
        $this->assertFalse($this->object->checkScope('xxx'), 'User should not have "xxx" in scope');
        $this->object->requesterId = 99;
        $this->assertFalse($this->object->checkScope('user'), 'Unknown user should not have "user" in scope');
    }

    /**
     * @covers Api::output
     * @runInSeparateProcess
     */
    public function testOutputJson()
    {
        //set method for use in CLI
        $_SERVER['REQUEST_METHOD'] = 'GET';
        $this->object = new Api('json', array('GET'));
        $dummy = new stdClass();
        $dummy->attributeOne = 'one';
        $dummy->attributeTwo = 'two';
        ob_start();
        $this->object->output(200, $dummy);
        $output = ob_get_contents();
        ob_end_clean();
        $this->assertEquals(json_encode($dummy), $output, 'Output should be a JSON string');
        if (!function_exists('xdebug_get_headers')) {
            $this->markTestIncomplete('xdebug_get_headers function does not exist; can not check Content-type');

            return;
        }
        $headers = xdebug_get_headers();
        $this->assertContains('Content-type: application/json; charset=UTF-8', $headers, 'Output should include a content-type header');
    }

    /**
     * @covers Api::output
     * @runInSeparateProcess
     */
    public function testOutputHtml()
    {
        //set method for use in CLI
        $_SERVER['REQUEST_METHOD'] = 'GET';
        $this->object = new Api('html', array('GET'));
        $dummy = '<div></div>';
        ob_start();
        $this->object->output(200, $dummy);
        $output = ob_get_contents();
        ob_end_clean();
        $this->assertEquals($dummy, $output, 'Output should be a HTML string');
        if (!function_exists('xdebug_get_headers')) {
            $this->markTestIncomplete('xdebug_get_headers function does not exist; can not check Content-type');

            return;
        }
        $headers = xdebug_get_headers();
        $this->assertContains('Content-type: text/html; charset=UTF-8', $headers, 'Output should include a content-type header');
    }

    /**
     * @covers Api::output
     * @runInSeparateProcess
     */
    public function testOutputXml()
    {
        //set method for use in CLI
        $_SERVER['REQUEST_METHOD'] = 'GET';
        $this->object = new Api('xml', array('GET'));
        $dummy = '<object></object>';
        ob_start();
        $this->object->output(200, $dummy);
        $output = ob_get_contents();
        ob_end_clean();
        $this->assertEquals($dummy, $output, 'Output should be a XML string');
        if (!function_exists('xdebug_get_headers')) {
            $this->markTestIncomplete('xdebug_get_headers function does not exist; can not check Content-type');

            return;
        }
        $headers = xdebug_get_headers();
        $this->assertContains('Content-type: application/xml; charset=UTF-8', $headers, 'Output should include a content-type header');
    }
}
